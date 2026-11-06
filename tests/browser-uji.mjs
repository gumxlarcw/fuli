import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// CDP memakai Chromium lokal, profil sementara, dan port acak. Profil pengguna tidak dibaca.
const alamat = process.env.FULI_TEST_URL || "http://127.0.0.1:6071";
assert(["127.0.0.1", "localhost", "[::1]"].includes(new URL(alamat).hostname), "Uji hanya boleh mengarah ke aplikasi lokal.");
const batasUji = Number(process.env.FULI_TEST_TIMEOUT || 60000);
assert(Number.isFinite(batasUji) && batasUji > 0, "FULI_TEST_TIMEOUT harus berisi milidetik positif.");
const batasStartup = Math.max(60000, batasUji);
const profil = await mkdtemp(join(tmpdir(), "fuli-uji-browser-"));
const browser = spawn(process.env.CHROMIUM_PATH || "/usr/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check",
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=0", `--user-data-dir=${profil}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"], detached: true });
let socket;
let urut = 0;
const janji = new Map();
const galatHalaman = new Map();
const hasil = [];
const tunda = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let pembersihan;

// PID negatif hanya menunjuk grup proses privat yang dibuat melalui detached:true.
// Ini juga menghentikan renderer/GPU anak bila browser belum sempat membuka CDP.
async function bersihkan() {
  if (pembersihan) return pembersihan;
  pembersihan = (async () => {
    if (socket?.readyState === WebSocket.OPEN) {
      await cdp("Browser.close", {}, undefined, 2000).catch(() => {});
      socket.close();
    }
    const grupAda = () => {
      if (!browser.pid) return false;
      try { process.kill(-browser.pid, 0); return true; } catch (error) { if (error.code === "ESRCH") return false; throw error; }
    };
    const sinyal = (nama) => {
      if (!browser.pid) return;
      try { process.kill(-browser.pid, nama); } catch (error) { if (error.code !== "ESRCH") throw error; }
    };
    sinyal("SIGTERM");
    for (let n = 0; n < 20 && grupAda(); n++) await tunda(100);
    if (grupAda()) sinyal("SIGKILL");
    await tunda(200);
    for (const p of janji.values()) { clearTimeout(p.timer); p.reject(new Error("Browser uji dihentikan.")); }
    janji.clear();
    await rm(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  })();
  return pembersihan;
}

for (const [nama, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(nama, () => { void bersihkan().finally(() => process.exit(code)); });
}

function cdp(method, params = {}, sessionId, batas = batasUji) {
  const id = ++urut;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { janji.delete(id); reject(new Error(`CDP melewati batas waktu: ${method}`)); }, batas);
    janji.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

async function evaluasi(session, expression) {
  const r = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, session);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}

async function tunggu(session, expression, pesan, batas = batasUji) {
  const awal = Date.now();
  while (Date.now() - awal < batas) {
    try {
      if (await evaluasi(session, expression)) return;
    } catch (error) {
      // Navigasi dapat mengganti konteks tepat ketika pemeriksaan berikutnya dimulai.
      if (!/context.*destroyed|Cannot find context|Inspected target navigated/i.test(String(error))) throw error;
    }
    await tunda(80);
  }
  throw new Error(`Tidak terpenuhi: ${pesan}`);
}

async function halaman({ width = 1440, height = 1000, reduced = false, fallback = false } = {}) {
  const { browserContextId } = await cdp("Target.createBrowserContext");
  const { targetId } = await cdp("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  galatHalaman.set(sessionId, []);
  await cdp("Runtime.enable", {}, sessionId);
  await cdp("Page.enable", {}, sessionId);
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 }, sessionId);
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] }, sessionId);
  if (fallback) await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const asli = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (jenis, ...argumen) {
      if (/webgl/i.test(jenis)) return null;
      return asli.call(this, jenis, ...argumen);
    };
  }` }, sessionId);
  await cdp("Page.navigate", { url: alamat }, sessionId);
  await tunggu(sessionId, `!!document.querySelector('textarea[aria-label="Tulis pertanyaan"]')`, "kolom pertanyaan tersedia");
  await tunggu(sessionId, `localStorage.getItem('fuli_token')?.startsWith('uji.')`, "identitas uji siap (aplikasi harus memakai backend tiruan)");
  return sessionId;
}

async function kirim(session, text) {
  await evaluasi(session, `(() => {
    const area = document.querySelector('textarea[aria-label="Tulis pertanyaan"]');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, ${JSON.stringify(text)});
    area.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await tunggu(session, `!!document.querySelector('button[aria-label="Kirim pertanyaan"]:not(:disabled)')`, "tombol kirim aktif");
  await evaluasi(session, `document.querySelector('button[aria-label="Kirim pertanyaan"]').click()`);
}

async function selesai(session) {
  await tunggu(session, `document.querySelector('.aplikasi')?.dataset.kerja === 'false' && !!document.querySelector('.blok-data')`, "SSE selesai dan blok data ditampilkan");
  await tunggu(session, `!document.querySelector('[data-mengalir="true"]')`, "seluruh teks jawaban selesai ditampilkan");
}

async function tanpaLuapan(session, nama) {
  const ukuran = await evaluasi(session, `({ layar: innerWidth, halaman: document.documentElement.scrollWidth, badan: document.body.scrollWidth })`);
  assert(ukuran.halaman <= ukuran.layar + 1 && ukuran.badan <= ukuran.layar + 1, `${nama} meluap secara horizontal: ${JSON.stringify(ukuran)}`);
}

async function tangkap(session, nama) {
  if (!process.env.FULI_TEST_OUTPUT) return;
  await mkdir(process.env.FULI_TEST_OUTPUT, { recursive: true });
  await evaluasi(session, "document.fonts.ready.then(() => true)");
  await tunda(1100);
  const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, session);
  await writeFile(join(process.env.FULI_TEST_OUTPUT, `${nama}.png`), Buffer.from(data, "base64"));
}

async function tombol(session, key) {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: key === "Escape" ? 27 : 9 }, session);
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: key === "Escape" ? 27 : 9 }, session);
}

async function uji(nama, tugas) {
  await tugas();
  hasil.push(nama);
  console.log(`LULUS: ${nama}`);
}

try {
  const endpoint = await new Promise((resolve, reject) => {
    let pesan = "";
    const timer = setTimeout(() => reject(new Error(`Chromium tidak menyediakan endpoint CDP dalam ${batasStartup} ms.`)), batasStartup);
    browser.once("error", (error) => { clearTimeout(timer); reject(error); });
    browser.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Chromium berhenti sebelum siap (${code}).`)); });
    browser.stderr.on("data", (data) => {
      pesan = (pesan + String(data)).slice(-8192);
      const match = pesan.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Sambungan CDP tidak siap.")), batasUji);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", (error) => { clearTimeout(timer); reject(error); }, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.id && janji.has(data.id)) {
      const p = janji.get(data.id);
      clearTimeout(p.timer);
      janji.delete(data.id);
      if (data.error) p.reject(new Error(JSON.stringify(data.error)));
      else p.resolve(data.result);
    } else if (data.method === "Runtime.exceptionThrown") {
      galatHalaman.get(data.sessionId)?.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
    }
  });

  const desktop = await halaman();
  await uji("hero desktop terang dan gelap tidak meluap", async () => {
    await evaluasi(desktop, `document.querySelector('button[aria-label="Pakai tampilan terang"]')?.click()`);
    await tunggu(desktop, `!!document.querySelector('button[aria-label="Pakai tampilan gelap"]')`, "tema terang aktif");
    await tanpaLuapan(desktop, "Hero desktop terang");
    await tangkap(desktop, "desktop-hero-light");
    await evaluasi(desktop, `document.querySelector('button[aria-label="Pakai tampilan gelap"]').click()`);
    await tunggu(desktop, `document.documentElement.getAttribute('data-theme') === 'dark'`, "tema gelap aktif");
    await tanpaLuapan(desktop, "Hero desktop gelap");
    await tangkap(desktop, "desktop-hero-dark");
    await evaluasi(desktop, `document.querySelector('button[aria-label="Pakai tampilan terang"]').click()`);
    await tunggu(desktop, `document.documentElement.getAttribute('data-theme') === 'light'`, "tema terang dipulihkan");
  });
  await uji("dialog riwayat menjaga dan memulihkan fokus keyboard", async () => {
    await evaluasi(desktop, `(() => { const b = document.querySelector('button[aria-label="Riwayat percakapan"]'); b.focus(); b.click(); })()`);
    await tunggu(desktop, `document.activeElement?.getAttribute('aria-label') === 'Tutup riwayat'`, "fokus awal di dialog riwayat");
    await evaluasi(desktop, `(() => { const daftar = [...document.querySelectorAll('.laci button:not(:disabled), .laci a[href], .laci [tabindex="0"]')]; daftar.at(-1).focus(); })()`);
    await tombol(desktop, "Tab");
    await tunggu(desktop, `document.activeElement?.getAttribute('aria-label') === 'Tutup riwayat'`, "Tab berputar di dalam dialog");
    await tombol(desktop, "Escape");
    await tunggu(desktop, `!document.querySelector('.laci')`, "Escape menutup riwayat");
    assert.equal(await evaluasi(desktop, `document.activeElement?.getAttribute('aria-label')`), "Riwayat percakapan", "Fokus harus kembali ke tombol pembuka.");
  });
  await uji("SSE menunjukkan status, teks parsial, lalu selesai", async () => {
    await kirim(desktop, "UJI: Tampilkan indeks buatan");
    await tunggu(desktop, `document.querySelector('.aplikasi')?.dataset.kerja === 'true' && document.body.innerText.includes('Membaca data uji')`, "status sebelum teks");
    await tunggu(desktop, `document.querySelector('.aplikasi')?.dataset.kerja === 'true' && document.querySelector('.teks-fuli')?.innerText.includes('UJI')`, "teks muncul selama aliran aktif");
    await selesai(desktop);
    assert(await evaluasi(desktop, `document.querySelector('.teks-fuli')?.innerText.includes('bukan statistik resmi BPS')`));
  });
  await uji("grafik dan tabel bertukar serta nilai uji tampil", async () => {
    await evaluasi(desktop, `[...document.querySelectorAll('[role="tab"]')].find(e => e.textContent.trim() === 'Tabel').click()`);
    await tunggu(desktop, `document.querySelector('.blok-data table')?.innerText.includes('73')`, "nilai tabel sintetis");
    await evaluasi(desktop, `[...document.querySelectorAll('[role="tab"]')].find(e => e.textContent.trim() === 'Grafik').click()`);
    await tunggu(desktop, `!document.querySelector('.blok-data table') && !!document.querySelector('.blok-data svg')`, "grafik muncul kembali");
    await tangkap(desktop, "desktop-chat");
  });
  await uji("muat ulang memulihkan riwayat dan metadata grafik", async () => {
    const waktuAwal = await evaluasi(desktop, "performance.timeOrigin");
    await cdp("Page.reload", {}, desktop);
    await tunggu(desktop, `performance.timeOrigin > ${waktuAwal}`, "halaman benar-benar dimuat ulang");
    await tunggu(desktop, `!!document.querySelector('.blok-data') && document.body.innerText.includes('bukan statistik resmi BPS')`, "riwayat dari backend uji");
    assert.equal(await evaluasi(desktop, `document.querySelectorAll('.pesan-tanya').length`), 1);
    assert.equal(await evaluasi(desktop, `document.querySelectorAll('.pesan-jawab').length`), 1);
  });
  await uji("galat sementara dapat dikirim ulang", async () => {
    await kirim(desktop, "uji-gagal: pemulihan satu kali");
    await tunggu(desktop, `!!document.querySelector('.pesan-galat [type="button"]')`, "pesan gagal dan tombol kirim ulang");
    await evaluasi(desktop, `document.querySelector('.pesan-galat [type="button"]').click()`);
    await tunggu(desktop, `document.querySelectorAll('.blok-data').length === 2 && !document.querySelector('.pesan-galat')`, "retry berhasil tanpa galat tersisa");
    assert.equal(await evaluasi(desktop, `document.querySelectorAll('.pesan-tanya').length`), 2);
  });
  await uji("hentikan aliran memulihkan kolom pertanyaan", async () => {
    await kirim(desktop, "uji-lambat: hentikan sebelum teks pertama");
    await tunggu(desktop, `document.body.innerText.includes('Membaca data uji') && !!document.querySelector('button[aria-label="Hentikan jawaban"]')`, "aliran lambat aktif");
    await evaluasi(desktop, `document.querySelector('button[aria-label="Hentikan jawaban"]').click()`);
    await tunggu(desktop, `document.querySelector('.aplikasi')?.dataset.kerja === 'false' && document.body.innerText.includes('Jawaban dihentikan.')`, "jawaban dihentikan sebelum ada teks");
    assert(await evaluasi(desktop, `!!document.querySelector('button[aria-label="Kirim pertanyaan"]')`));
  });

  const mobile = await halaman({ width: 390, height: 844 });
  await uji("lebar 390 px aman pada hero dan percakapan", async () => {
    await tanpaLuapan(mobile, "Hero 390 px");
    await tangkap(mobile, "mobile-hero");
    await kirim(mobile, "UJI: Grafik pada layar kecil");
    await selesai(mobile);
    await tanpaLuapan(mobile, "Chat 390 px");
    await evaluasi(mobile, `[...document.querySelectorAll('[role="tab"]')].find(e => e.textContent.trim() === 'Tabel').click()`);
    await tanpaLuapan(mobile, "Tabel 390 px");
    await tangkap(mobile, "mobile-chat");
  });
  const reduced = await halaman({ width: 390, height: 844, reduced: true });
  await uji("reduced-motion memakai visual statis dan tetap bisa menjawab", async () => {
    assert(await evaluasi(reduced, `matchMedia('(prefers-reduced-motion: reduce)').matches`));
    await tunggu(reduced, `document.querySelector('.aplikasi')?.dataset.statis === 'true' && !!document.querySelector('.jangkar img')`, "visual statis ketika gerak dikurangi");
    await tanpaLuapan(reduced, "Reduced-motion 390 px");
    await tangkap(reduced, "reduced-motion");
    await kirim(reduced, "UJI: Pertanyaan tanpa animasi");
    await selesai(reduced);
  });
  const fallback = await halaman({ width: 390, height: 844, fallback: true });
  await uji("WebGL gagal menampilkan SVG dan chat tetap berjalan", async () => {
    assert(await evaluasi(fallback, `!matchMedia('(prefers-reduced-motion: reduce)').matches`));
    await tunggu(fallback, `document.querySelector('.aplikasi')?.dataset.statis === 'true' && !!document.querySelector('.jangkar img')`, "pengganti SVG setelah pembuatan konteks WebGL gagal");
    await tanpaLuapan(fallback, "Fallback 390 px");
    await tangkap(fallback, "fallback-webgl");
    await kirim(fallback, "UJI: Pertanyaan tanpa WebGL");
    await selesai(fallback);
    await tanpaLuapan(fallback, "Chat fallback 390 px");
  });
  await uji("tidak ada exception JavaScript yang tidak ditangani", async () => {
    assert.deepEqual([...galatHalaman.values()].flat(), []);
  });
  console.log(JSON.stringify({ lulus: hasil.length, pemeriksaan: hasil }, null, 2));
} catch (error) {
  console.error(`GAGAL: ${error.stack || error}`);
  console.error(JSON.stringify({ lulus: hasil.length, pemeriksaan: hasil }, null, 2));
  process.exitCode = 1;
} finally {
  await bersihkan();
}
