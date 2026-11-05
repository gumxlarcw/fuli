/**
 * Adegan 3D Fuli: biji pala mengilap yang dibungkus jala merah.
 * Jala dibangkitkan dari kode, sama di setiap muatan (generator acak berbenih).
 * Delapan batang jala mewakili delapan tahap kerja jawaban: tiap tahap yang berjalan
 * menyalakan satu batang, jadi gerak di sini memang membaca keadaan sistem.
 */
import * as THREE from "three";

export type TemaAdegan = "light" | "dark";
export type ModusAdegan = "hero" | "chat";

export type AdeganFuli = {
  aturModus: (m: ModusAdegan) => void;
  aturTema: (t: TemaAdegan) => void;
  aturKerja: (kerja: boolean) => void;
  aturTahap: (n: number) => void;
  sentak: () => void;
  bersihkan: () => void;
};

type Opsi = {
  kanvas: HTMLCanvasElement;
  jangkar: HTMLElement;
  gerakDikurangi: boolean;
  tema: TemaAdegan;
  modus: ModusAdegan;
  padaSiap?: () => void;
  padaGagal?: () => void;
};

const TERAPAN = { a: 0.98, b: 1.1 };
const JUMLAH_BATANG = 8;

function acakBerbenih(benih: number) {
  let t = benih >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jari-jari permukaan biji, berkerut seperti biji pala kering. */
function kerut(theta: number, phi: number) {
  // Kerutan memudar di kedua kutub; tanpa ini sudut theta menyatu dan biji tampak tercubit.
  const redam = Math.pow(Math.sin(phi), 1.5);
  return (
    1 +
    redam *
      (0.016 * Math.sin(theta * 7 + 2.2 * Math.sin(phi * 1.7)) +
        0.009 * Math.sin(theta * 13 + phi * 5) +
        0.012 * Math.cos(phi * 3 + theta * 2))
  );
}

function titikPermukaan(theta: number, phi: number, lepas: number, keluar: THREE.Vector3) {
  const r = kerut(theta, phi) * lepas;
  return keluar.set(
    TERAPAN.a * Math.sin(phi) * Math.cos(theta) * r,
    -TERAPAN.b * Math.cos(phi) * r,
    TERAPAN.a * Math.sin(phi) * Math.sin(theta) * r,
  );
}

function buatBiji(): THREE.BufferGeometry {
  const lebar = 96;
  const geo = new THREE.SphereGeometry(1, lebar, 72);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const warna = new Float32Array(pos.count * 3);
  const gelap = new THREE.Color("#2b100c");
  const terang = new THREE.Color("#7a4228");
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const phi = Math.acos(THREE.MathUtils.clamp(-v.y, -1, 1));
    const theta = Math.atan2(v.z, v.x);
    titikPermukaan(theta, phi, 1, v);
    pos.setXYZ(i, v.x, v.y, v.z);
    const urat = 0.5 + 0.5 * Math.sin(theta * 7 + 2.2 * Math.sin(phi * 1.7));
    c.copy(gelap).lerp(terang, Math.pow(urat, 2.2) * 0.85);
    warna.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(warna, 3));
  geo.computeVertexNormals();
  // Jahitan bola: samakan normal baris pertama dan terakhir supaya tak ada garis.
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const perBaris = lebar + 1;
  for (let baris = 0; baris < pos.count / perBaris; baris++) {
    const a = baris * perBaris;
    const b = a + lebar;
    const n = new THREE.Vector3(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
    nor.setXYZ(a, n.x, n.y, n.z);
    nor.setXYZ(b, n.x, n.y, n.z);
  }
  return geo;
}

type Jalur = { titik: { theta: number; phi: number }[]; lebar: number; grup: number; ujung: boolean };

/**
 * Fuli tumbuh dari pangkal biji: lembar lebar di bawah, bercabang menyempit ke atas,
 * dan ujungnya berhenti sebelum puncak supaya kilap biji tetap terlihat.
 */
function tumbuhkanJala(): Jalur[] {
  const acak = acakBerbenih(8200);
  const hasil: Jalur[] = [];
  const PHI_AWAL = 0.14;
  const PHI_AKHIR = 2.52;

  const tumbuh = (theta: number, phi: number, lebar: number, kedalaman: number, grup: number, condong: number) => {
    const titik = [{ theta, phi }];
    const panjang = 4 + Math.floor(acak() * 3) + (kedalaman === 0 ? 2 : 0);
    let arah = condong;
    for (let i = 0; i < panjang; i++) {
      phi += 0.062 + acak() * 0.028;
      arah += (acak() - 0.5) * 0.022;
      const kerapatan = Math.max(0.4, Math.sin(phi));
      theta += arah / kerapatan;
      titik.push({ theta, phi });
      if (phi > PHI_AKHIR) break;
    }
    const berhenti = phi > PHI_AKHIR - 0.06 || kedalaman >= 4;
    hasil.push({ titik, lebar, grup, ujung: berhenti });
    if (berhenti) return;
    const sebar = 0.032 + acak() * 0.03;
    tumbuh(theta, phi, lebar * 0.78, kedalaman + 1, grup, arah + sebar);
    tumbuh(theta, phi, lebar * 0.78, kedalaman + 1, grup, arah - sebar);
  };

  for (let i = 0; i < JUMLAH_BATANG; i++) {
    const theta = (i / JUMLAH_BATANG) * Math.PI * 2 + (acak() - 0.5) * 0.2;
    tumbuh(theta, PHI_AWAL, 0.062, 0, i, (acak() - 0.5) * 0.03);
  }

  // Jembatan antarcabang: inilah yang membuat jala terbaca sebagai renda, bukan pohon.
  const tepi = hasil.filter((j) => j.lebar < 0.036);
  for (let k = 0; k < 72; k++) {
    const a = tepi[Math.floor(acak() * tepi.length)];
    const b = tepi[Math.floor(acak() * tepi.length)];
    if (!a || !b || a === b) continue;
    const pa = a.titik[Math.floor(acak() * a.titik.length)];
    let terbaik = b.titik[0];
    let jarak = Infinity;
    for (const pb of b.titik) {
      const d = Math.hypot((pa.theta - pb.theta) * Math.sin(pa.phi), pa.phi - pb.phi);
      if (d < jarak) {
        jarak = d;
        terbaik = pb;
      }
    }
    if (jarak < 0.05 || jarak > 0.2) continue;
    const tengah = { theta: (pa.theta + terbaik.theta) / 2, phi: (pa.phi + terbaik.phi) / 2 + 0.012 };
    hasil.push({ titik: [pa, tengah, terbaik], lebar: 0.012, grup: a.grup, ujung: false });
  }
  return hasil;
}

/** Pita melengkung: penampang tiga titik supaya menangkap cahaya seperti renda basah. */
function buatJala(jalur: Jalur[]): THREE.BufferGeometry {
  const posisi: number[] = [];
  const nilaiT: number[] = [];
  const nilaiGrup: number[] = [];
  const indeks: number[] = [];
  const p = new THREE.Vector3();
  const atas = new THREE.Vector3();
  const samping = new THREE.Vector3();
  const tangen = new THREE.Vector3();

  for (const j of jalur) {
    const kontrol = j.titik.map((t) => titikPermukaan(t.theta, t.phi, 1.006, new THREE.Vector3()));
    if (kontrol.length < 2) continue;
    const kurva = new THREE.CatmullRomCurve3(kontrol, false, "centripetal");
    const bagian = Math.max(6, kontrol.length * 5);
    const awal = posisi.length / 3;
    const phiAwal = j.titik[0].phi;
    const phiAkhir = j.titik[j.titik.length - 1].phi;
    for (let i = 0; i <= bagian; i++) {
      const u = i / bagian;
      kurva.getPoint(u, p);
      kurva.getTangent(u, tangen);
      atas.copy(p).normalize();
      samping.crossVectors(tangen, atas).normalize();
      const sempit = THREE.MathUtils.lerp(1, 0.8, u);
      const runcing = j.ujung ? Math.sqrt(Math.min(1, (1 - u) * 2.6)) : 1;
      const lebar = j.lebar * sempit * runcing;
      const t = THREE.MathUtils.lerp(phiAwal, phiAkhir, u) / Math.PI;
      for (const sisi of [-1, 0, 1]) {
        const naik = sisi === 0 ? lebar * 0.5 : 0;
        posisi.push(
          p.x + samping.x * sisi * lebar + atas.x * naik,
          p.y + samping.y * sisi * lebar + atas.y * naik,
          p.z + samping.z * sisi * lebar + atas.z * naik,
        );
        nilaiT.push(t);
        nilaiGrup.push(j.grup);
      }
    }
    for (let i = 0; i < bagian; i++) {
      for (let s = 0; s < 2; s++) {
        const a = awal + i * 3 + s;
        const b = a + 3;
        indeks.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(posisi, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(nilaiT, 1));
  geo.setAttribute("aGrup", new THREE.Float32BufferAttribute(nilaiGrup, 1));
  geo.setIndex(indeks);
  geo.computeVertexNormals();
  return geo;
}

/** Serat panjang yang keluar dari biji di layar pembuka. */
function buatSerat(): THREE.BufferGeometry {
  const acak = acakBerbenih(82);
  const posisi: number[] = [];
  const nilaiT: number[] = [];
  const nilaiAcak: number[] = [];
  const indeks: number[] = [];
  const JUMLAH = 13;
  const TITIK = 54;
  let dasar = 0;
  for (let s = 0; s < JUMLAH; s++) {
    const sudut = (s / JUMLAH) * Math.PI * 2 + acak() * 0.4;
    const ayun = (acak() - 0.5) * 2.4;
    const jauh = 5 + acak() * 3.5;
    const kac = acak();
    for (let i = 0; i < TITIK; i++) {
      const u = i / (TITIK - 1);
      const r = 1.08 + u * jauh;
      const lengkung = sudut + ayun * u * u;
      posisi.push(Math.cos(lengkung) * r, Math.sin(lengkung) * r * 0.74, -0.4 - u * 1.5);
      nilaiT.push(u);
      nilaiAcak.push(kac);
      if (i < TITIK - 1) indeks.push(dasar + i, dasar + i + 1);
    }
    dasar += TITIK;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(posisi, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(nilaiT, 1));
  geo.setAttribute("aAcak", new THREE.Float32BufferAttribute(nilaiAcak, 1));
  geo.setIndex(indeks);
  return geo;
}

export function buatAdeganFuli(o: Opsi): AdeganFuli {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.kanvas, alpha: true, antialias: true, powerPreference: "default" });
  } catch {
    o.padaGagal?.();
    return { aturModus() {}, aturTema() {}, aturKerja() {}, aturTahap() {}, sentak() {}, bersihkan() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const FOV = 30;
  const JARAK = 9;
  const kamera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  kamera.position.z = JARAK;

  const langit = new THREE.HemisphereLight(0xfbf7d8, 0x4a1218, 1.05);
  const utama = new THREE.DirectionalLight(0xfff0d6, 2.5);
  utama.position.set(2.6, 3.4, 4);
  const tepi = new THREE.DirectionalLight(0xff3b4a, 1.7);
  tepi.position.set(-3.4, -1.2, -2.4);
  scene.add(langit, utama, tepi);

  const akar = new THREE.Group();
  const putar = new THREE.Group();
  akar.add(putar);
  scene.add(akar);
  putar.rotation.z = -0.32;
  putar.rotation.x = 0.18;

  const geoBiji = buatBiji();
  const bahanBiji = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.36,
    metalness: 0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.24,
  });
  putar.add(new THREE.Mesh(geoBiji, bahanBiji));

  const seragam = {
    uTumbuh: { value: o.gerakDikurangi ? 1.2 : 0 },
    uWaktu: { value: 0 },
    uDenyut: { value: 0.12 },
    uTahap: { value: 0 },
    uPanas: { value: new THREE.Color("#ff7a3d") },
  };

  const geoJala = buatJala(tumbuhkanJala());
  const bahanJala = new THREE.MeshPhysicalMaterial({
    color: "#c30f2b",
    roughness: 0.4,
    metalness: 0,
    sheen: 1,
    sheenColor: new THREE.Color("#ff8d7a"),
    sheenRoughness: 0.5,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    side: THREE.DoubleSide,
  });
  bahanJala.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, seragam);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aT;\nattribute float aGrup;\nvarying float vT;\nvarying float vGrup;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvT = aT;\nvGrup = aGrup;");
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTumbuh;\nuniform float uWaktu;\nuniform float uDenyut;\nuniform float uTahap;\nuniform vec3 uPanas;\nvarying float vT;\nvarying float vGrup;",
      )
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vT > uTumbuh) discard;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float gelombang = fract(vT * 2.4 - uWaktu * 0.46 + vGrup * 0.183);
        float kilat = smoothstep(0.0, 0.05, gelombang) * smoothstep(0.2, 0.05, gelombang);
        float nyala = step(vGrup + 0.5, uTahap) * 0.34;
        float ujung = smoothstep(uTumbuh - 0.07, uTumbuh, vT) * step(uTumbuh, 1.0);
        totalEmissiveRadiance += uPanas * (kilat * uDenyut * 1.5 + nyala * uDenyut + ujung * 1.1);`,
      );
  };
  putar.add(new THREE.Mesh(geoJala, bahanJala));
  o.kanvas.dataset.segitigaJala = String((geoJala.index?.count ?? 0) / 3);

  const seragamHalo = {
    uWarna: { value: new THREE.Color("#d8202f") },
    uKuat: { value: 0.1 },
  };
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.28, 48, 36),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: seragamHalo,
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uWarna; uniform float uKuat; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(clamp(dot(vN, vV)*-1.0,0.0,1.0), 2.6); gl_FragColor = vec4(uWarna, f*uKuat); }`,
    }),
  );
  akar.add(halo);

  const seragamSerat = {
    uWaktu: { value: 0 },
    uBuka: { value: o.modus === "hero" ? (o.gerakDikurangi ? 1 : 0) : 0 },
    uWarna: { value: new THREE.Color(o.tema === "dark" ? "#ff5b62" : "#be1128") },
    uTumbuh: { value: o.gerakDikurangi ? 1 : 0 },
  };
  const serat = new THREE.LineSegments(
    buatSerat(),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: seragamSerat,
      vertexShader: `attribute float aT; attribute float aAcak; varying float vT; varying float vA; uniform float uWaktu;
        void main(){ vT=aT; vA=aAcak; vec3 p=position; p.y += sin(aT*5.0 + uWaktu*0.35 + aAcak*9.0)*0.06*aT; p.x += cos(aT*4.0 + uWaktu*0.28 + aAcak*7.0)*0.05*aT;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
      fragmentShader: `uniform float uWaktu; uniform float uBuka; uniform float uTumbuh; uniform vec3 uWarna; varying float vT; varying float vA;
        void main(){ if(vT>uTumbuh*1.02) discard; float g=fract(vT*1.4 - uWaktu*0.2 + vA*5.0); float k=smoothstep(0.0,0.03,g)*smoothstep(0.11,0.03,g);
        float a=(0.2*(1.0-vT*0.8)+k*0.65)*smoothstep(0.0,0.05,vT)*(1.0-smoothstep(0.82,1.0,vT))*uBuka; gl_FragColor=vec4(uWarna,a); }`,
    }),
  );
  akar.add(serat);

  let tema: TemaAdegan = o.tema;
  let modus: ModusAdegan = o.modus;
  let kerja = false;
  let tahapTarget = 0;
  let sentakan = 0;
  let waktu = 0;
  let sudut = 0.7;
  let sudutCepat = 0;
  let tumbuhMulai = -1;
  let dipasang = true;
  let sudahSiap = false;
  let raf = 0;
  let lalu = performance.now();
  let lambatHitung = 0;
  let sampel = 0;
  let batasFrame = 0;
  let terakhirGambar = 0;
  let w = 0;
  let h = 0;
  let px = 0;
  let py = 0;

  const terapkanTema = () => {
    const gelap = tema === "dark";
    langit.intensity = gelap ? 0.8 : 1.05;
    tepi.intensity = gelap ? 2.6 : 1.7;
    utama.intensity = gelap ? 2.2 : 2.5;
    seragamHalo.uWarna.value.set(gelap ? "#ff3b4a" : "#d8202f");
    seragamSerat.uWarna.value.set(gelap ? "#ff5b62" : "#be1128");
  };
  terapkanTema();

  const ukur = () => {
    const nw = window.innerWidth;
    const nh = window.innerHeight;
    if (nw === w && nh === h) return;
    w = nw;
    h = nh;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    kamera.updateProjectionMatrix();
  };
  ukur();
  window.addEventListener("resize", ukur);

  const padaPenunjuk = (e: PointerEvent) => {
    px = (e.clientX / (w || 1)) * 2 - 1;
    py = (e.clientY / (h || 1)) * 2 - 1;
  };
  if (!o.gerakDikurangi) window.addEventListener("pointermove", padaPenunjuk, { passive: true });

  const padaHilang = (e: Event) => {
    e.preventDefault();
    o.padaGagal?.();
  };
  o.kanvas.addEventListener("webglcontextlost", padaHilang);

  const gambar = (now: number) => {
    raf = requestAnimationFrame(gambar);
    if (document.hidden) {
      lalu = now;
      return;
    }
    const dt = Math.min(0.05, (now - lalu) / 1000);
    lalu = now;

    // Mesin lemah: turunkan resolusi dan kecepatan gambar, chat tetap lancar.
    if (!o.gerakDikurangi && sudahSiap && sampel < 60) {
      sampel++;
      if (dt > 0.042) lambatHitung++;
      if (sampel === 60 && lambatHitung > 30) {
        dpr = 1;
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        batasFrame = 1000 / 24;
      }
    }

    // Saat santai di percakapan, cukup 30 gambar per detik.
    const batas = o.gerakDikurangi ? 1000 / 12 : Math.max(batasFrame, modus === "chat" && !kerja ? 1000 / 30 : 0);
    if (batas && now - terakhirGambar < batas - 1) return;
    terakhirGambar = now;

    if (!o.gerakDikurangi) {
      waktu += dt;
      if (tumbuhMulai < 0) tumbuhMulai = waktu;
      const u = Math.min(1, (waktu - tumbuhMulai) / 2.1);
      seragam.uTumbuh.value = u >= 1 ? 1.2 : (1 - Math.pow(1 - u, 3)) * 1.01;
      seragamSerat.uTumbuh.value = Math.min(1, Math.max(0, (waktu - tumbuhMulai - 0.5) / 1.8));
      sudutCepat += ((kerja ? 0.42 : 0.1) - sudutCepat) * Math.min(1, dt * 2);
      sudut += sudutCepat * dt;
      sentakan *= Math.exp(-dt * 3.4);
    }

    seragam.uWaktu.value = waktu * (kerja ? 1.9 : 1);
    seragamSerat.uWaktu.value = waktu;
    const denyutTarget = o.gerakDikurangi ? 0 : kerja ? 0.95 : 0.14;
    seragam.uDenyut.value += (denyutTarget + sentakan * 1.4 - seragam.uDenyut.value) * Math.min(1, dt * 5 + (o.gerakDikurangi ? 1 : 0));
    seragam.uTahap.value += (tahapTarget - seragam.uTahap.value) * Math.min(1, dt * 4 + (o.gerakDikurangi ? 1 : 0));
    const haloTarget = 0.1 + seragam.uDenyut.value * 0.42 + sentakan * 0.5;
    seragamHalo.uKuat.value += (haloTarget - seragamHalo.uKuat.value) * Math.min(1, dt * 5 + (o.gerakDikurangi ? 1 : 0));
    const bukaTarget = modus === "hero" ? 1 : 0;
    seragamSerat.uBuka.value += (bukaTarget - seragamSerat.uBuka.value) * Math.min(1, dt * 2.4 + (o.gerakDikurangi ? 1 : 0));
    serat.visible = seragamSerat.uBuka.value > 0.01;

    // Biji mengikuti elemen jangkar di halaman. Tata letak tetap urusan CSS.
    const k = o.jangkar.getBoundingClientRect();
    const tinggiDunia = 2 * JARAK * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const perPx = tinggiDunia / (h || 1);
    const tx = (k.left + k.width / 2 - w / 2) * perPx;
    const ty = (h / 2 - (k.top + k.height / 2)) * perPx;
    const skala = (Math.max(k.width, 1) * perPx) / (2 * TERAPAN.b * 1.04);
    akar.position.set(tx, ty, 0);
    akar.scale.setScalar(skala * (1 + sentakan * 0.05));
    halo.visible = k.width > 40;

    putar.rotation.y = sudut + px * 0.24;
    putar.rotation.x = 0.18 + py * 0.14;

    renderer.render(scene, kamera);
    if (!sudahSiap) {
      sudahSiap = true;
      o.padaSiap?.();
    }
  };
  raf = requestAnimationFrame(gambar);

  return {
    aturModus(m) {
      modus = m;
    },
    aturTema(t) {
      tema = t;
      terapkanTema();
    },
    aturKerja(k) {
      kerja = k;
    },
    aturTahap(n) {
      tahapTarget = Math.min(JUMLAH_BATANG, Math.max(0, n));
    },
    sentak() {
      if (!o.gerakDikurangi) sentakan = 1;
    },
    bersihkan() {
      if (!dipasang) return;
      dipasang = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", ukur);
      window.removeEventListener("pointermove", padaPenunjuk);
      o.kanvas.removeEventListener("webglcontextlost", padaHilang);
      geoBiji.dispose();
      geoJala.dispose();
      serat.geometry.dispose();
      halo.geometry.dispose();
      bahanBiji.dispose();
      bahanJala.dispose();
      (serat.material as THREE.Material).dispose();
      (halo.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
