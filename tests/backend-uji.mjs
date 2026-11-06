import { createServer } from "node:http";

// Seluruh angka, identitas, dan jawaban di sini adalah data buatan untuk pengujian.
const host = "127.0.0.1";
const port = Number(process.env.FULI_FIXTURE_PORT || 6072);
const utas = new Map();
const pernahGagal = new Set();
let idUtas = 1000;
let idPesan = 5000;
const statistik = { stream: 0, selesai: 0, gagal: 0 };
const saran = ["UJI: Bandingkan data buatan", "UJI: Jelaskan arti indikator"];
const sekarang = () => new Date().toISOString();

export const metaUji = {
  v: 1,
  table: {
    kind: "data",
    title: "UJI — Indeks buatan, bukan statistik BPS",
    columns: ["Tahun", "Indeks uji"],
    rows: [
      { Tahun: "2022", "Indeks uji": 40 },
      { Tahun: "2023", "Indeks uji": 52 },
      { Tahun: "2024", "Indeks uji": 61 },
      { Tahun: "2025", "Indeks uji": 73 },
    ],
    total_rows: 4,
  },
  chart: {
    should_render: true,
    chart_type: "bar",
    chart_title: "UJI — Perubahan indeks buatan",
    chart_subtitle: "Angka sintetis untuk memeriksa tampilan",
    x_axis: { column: "Tahun", label: "Tahun", type: "category" },
    y_axis: { label: "Indeks uji", format: "index" },
    series: [{ column: "Indeks uji", label: "Indeks buatan" }],
  },
  sources: [{ type: "data", id: 90001, title: "UJI — Fixture lokal sintetis" }],
  suggestions: saran,
  confidence: { level: "high" },
  thinkingItems: [
    { step: "search", label: "Membaca data uji", detail: "Empat baris sintetis", elapsedMs: 120 },
    { step: "generating", label: "Menyiapkan jawaban uji", elapsedMs: 250 },
  ],
};

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

async function bacaJson(req) {
  let isi = "";
  for await (const bagian of req) {
    isi += bagian;
    if (isi.length > 65536) throw new Error("tubuh_terlalu_besar");
  }
  return isi ? JSON.parse(isi) : {};
}

function simpanPesan(u, role, content) {
  const pesan = { id: ++idPesan, role, content, created_at: sekarang() };
  u.messages.push(pesan);
  u.last_message_at = pesan.created_at;
}

async function alirkan(req, res, u, text) {
  statistik.stream++;
  const kunci = `${u.id}:${text}`;
  if (/uji-gagal/i.test(text) && !pernahGagal.has(kunci)) {
    pernahGagal.add(kunci);
    statistik.gagal++;
    return json(res, 503, { ok: false, error: "uji_gagal_sekali" });
  }
  simpanPesan(u, "user", text);
  u.title = "UJI — Percakapan sintetis";
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  let tertutup = false;
  res.on("close", () => { tertutup = true; });
  const kirim = (event, value) => {
    if (!tertutup) res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
  };
  const tunggu = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  kirim("status", { stage: "search", message: "Membaca data uji" });
  kirim("status_detail", { stage: "search", detail: "Empat baris sintetis", elapsedMs: 120 });
  kirim("thread_updated", { title: u.title });
  await tunggu(/uji-lambat/i.test(text) ? 9000 : 300);
  if (tertutup) return;
  kirim("status", { stage: "generating", message: "Menyiapkan jawaban uji" });
  const bagian = [
    "**UJI SINTETIS.** Ini jawaban buatan untuk memeriksa antarmuka. ",
    "Indeks uji meningkat dari 40 menjadi 73 dalam empat periode. ",
    "Angka ini bukan statistik resmi BPS.",
  ];
  for (const content of bagian) {
    kirim("text", { content });
    await tunggu(350);
    if (tertutup) return;
  }
  kirim("malika_ui", metaUji);
  const fullText = bagian.join("");
  simpanPesan(u, "assistant", `${fullText}\n\n\`\`\`malika_ui\n${JSON.stringify(metaUji)}\n\`\`\``);
  kirim("done", { full_text: fullText });
  statistik.selesai++;
  res.end();
}

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, `http://${host}:${port}`).pathname;
    const uid = req.headers["x-malika-uid"] || "uji-tanpa-identitas";
    if (req.method === "GET" && path === "/__uji/health") return json(res, 200, { ok: true, fixture: "fuli-sintetis", ...statistik });
    if (req.method === "POST" && path === "/chat/identity") {
      const body = await bacaJson(req);
      // Format mirip token untuk kontrak parser; tidak memiliki tanda tangan atau otoritas.
      const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 90 * 86400, uji: true })).toString("base64url");
      return json(res, 200, { uid: body.uid || "identitas-uji", token: `uji.${payload}.bukan-token-nyata` });
    }
    if (path === "/chat/threads") {
      if (req.method === "GET") return json(res, 200, { threads: [...utas.values()].filter((u) => u.uid === uid).map(({ messages, uid: pemilik, ...u }) => u) });
      if (req.method === "POST") {
        const u = { id: ++idUtas, title: "UJI — Chat baru", created_at: sekarang(), last_message_at: null, uid, messages: [] };
        utas.set(u.id, u);
        const { messages, uid: pemilik, ...thread } = u;
        return json(res, 200, { thread });
      }
    }
    const cocok = path.match(/^\/chat\/threads\/(\d+)(?:\/(messages|suggestions|stream))?$/);
    if (cocok) {
      const u = utas.get(Number(cocok[1]));
      if (!u || u.uid !== uid) return json(res, 404, { ok: false, error: "utas_uji_tidak_ada" });
      if (req.method === "DELETE" && !cocok[2]) { utas.delete(u.id); return json(res, 200, { ok: true }); }
      if (req.method === "GET" && cocok[2] === "messages") return json(res, 200, { messages: u.messages });
      if (req.method === "GET" && cocok[2] === "suggestions") return json(res, 200, { suggestions: saran });
      if (req.method === "POST" && cocok[2] === "stream") return await alirkan(req, res, u, String((await bacaJson(req)).text || "UJI"));
    }
    if (req.method === "POST" && ["/chat-feedback", "/error-learning/flag"].includes(path)) return json(res, 200, { ok: true });
    if (req.method === "GET" && /^\/search\/knowledge\/\d+$/.test(path)) return json(res, 200, { title: "UJI — Dokumen sintetis", abstract: "Ringkasan ini hanya bahan uji lokal.", doc_type: "uji" });
    json(res, 404, { ok: false, error: "rute_uji_tidak_ada" });
  } catch {
    if (!res.headersSent) json(res, 400, { ok: false, error: "permintaan_uji_tidak_sah" });
    else res.end();
  }
});

server.listen(port, host, () => console.log(`Fixture sintetis Fuli siap di http://${host}:${server.address().port}; data hanya dalam memori.`));
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
