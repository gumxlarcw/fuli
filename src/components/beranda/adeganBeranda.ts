// @ts-nocheck -- porting langsung dari rancangan halaman muka yang diuji (landing/index.html).
// Panggung 3D halaman muka: biji pala berjala, buah yang membelah, serbuk per bab F-U-L-I.
// Dimuat dinamis oleh BerandaHidup sesudah hidrasi; gagal = kelas tanpa-3d dan tanda statis.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Kode wilayah BPS kabupaten/kota Maluku Utara (sama dengan daftar di markup.ts).
const WILAYAH_BPS = [
  ["8201", "Halmahera Barat"],
  ["8202", "Halmahera Tengah"],
  ["8203", "Kepulauan Sula"],
  ["8204", "Halmahera Selatan"],
  ["8205", "Halmahera Utara"],
  ["8206", "Halmahera Timur"],
  ["8207", "Pulau Morotai"],
  ["8208", "Pulau Taliabu"],
  ["8271", "Kota Ternate"],
  ["8272", "Kota Tidore Kepulauan"],
];


const akar = document.documentElement;
const kanvas = document.getElementById("adegan");
const kurang = matchMedia("(prefers-reduced-motion: reduce)").matches;
const token = (n) => getComputedStyle(akar).getPropertyValue(n).trim();
const warna = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const halus = (t) => t * t * (3 - 2 * t);
const keluarKubik = (t) => 1 - Math.pow(1 - t, 3);
const jepit = (x, a, b) => Math.min(b, Math.max(a, x));

function acakBerbenih(benih) {
  let t = benih >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Biji pala dan jala fuli (sama dengan adegan aplikasi Fuli) ---------- */
const SUMBU_A = 0.98, SUMBU_B = 1.1, JUMLAH_BATANG = 8;

function kerut(theta, phi) {
  const redam = Math.pow(Math.sin(phi), 1.5);
  return 1 + redam * (0.016 * Math.sin(theta * 7 + 2.2 * Math.sin(phi * 1.7)) + 0.009 * Math.sin(theta * 13 + phi * 5) + 0.012 * Math.cos(phi * 3 + theta * 2));
}
function titikPermukaan(theta, phi, lepas, v) {
  const r = kerut(theta, phi) * lepas;
  return v.set(SUMBU_A * Math.sin(phi) * Math.cos(theta) * r, -SUMBU_B * Math.cos(phi) * r, SUMBU_A * Math.sin(phi) * Math.sin(theta) * r);
}
function buatBiji(gelap, terang) {
  const lebar = 96;
  const geo = new THREE.SphereGeometry(1, lebar, 72);
  const pos = geo.attributes.position;
  const w = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const phi = Math.acos(jepit(-v.y, -1, 1));
    const theta = Math.atan2(v.z, v.x);
    titikPermukaan(theta, phi, 1, v);
    pos.setXYZ(i, v.x, v.y, v.z);
    const urat = 0.5 + 0.5 * Math.sin(theta * 7 + 2.2 * Math.sin(phi * 1.7));
    c.copy(gelap).lerp(terang, Math.pow(urat, 1.6) * 0.95);
    w.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(w, 3));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, perBaris = lebar + 1;
  for (let baris = 0; baris < pos.count / perBaris; baris++) {
    const a = baris * perBaris, b = a + lebar;
    const n = new THREE.Vector3(nor.getX(a) + nor.getX(b), nor.getY(a) + nor.getY(b), nor.getZ(a) + nor.getZ(b)).normalize();
    nor.setXYZ(a, n.x, n.y, n.z); nor.setXYZ(b, n.x, n.y, n.z);
  }
  return geo;
}

/*
 * Kulit biji pala: alur berkelok (garis kontur derau) dan pori halus. Derau diambil di permukaan bola,
 * jadi tekstur tidak punya jahitan. R = tinggi (bump), G = kekasaran (alur lebih kusam).
 */
function buatTeksturBiji() {
  const U = 384, V = 192;
  const hash = (x, y, z) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const l = (a, b, t) => a + (b - a) * t;
  const derau = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let fx = x - xi, fy = y - yi, fz = z - zi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    return l(
      l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), fx), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), fx), fy),
      l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), fx), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), fx), fy),
      fz,
    );
  };
  const fbm = (x, y, z) => (derau(x, y, z) * 0.5 + derau(x * 2.03, y * 2.03, z * 2.03) * 0.25 + derau(x * 4.1, y * 4.1, z * 4.1) * 0.125) / 0.875;
  const tinggi = document.createElement("canvas"), rupa = document.createElement("canvas");
  tinggi.width = rupa.width = U; tinggi.height = rupa.height = V;
  const ct = tinggi.getContext("2d"), cr = rupa.getContext("2d");
  const dt = ct.createImageData(U, V), dr = cr.createImageData(U, V);
  for (let j = 0; j < V; j++) {
    const phi = ((j + 0.5) / V) * Math.PI, sp = Math.sin(phi), cp = Math.cos(phi);
    for (let i = 0; i < U; i++) {
      const th = ((i + 0.5) / U) * Math.PI * 2;
      const x = sp * Math.cos(th), y = cp, z = sp * Math.sin(th);
      const alur = 1 - jepit(Math.abs(fbm(x * 2.4 + 3.1, y * 3.2, z * 2.4) - 0.5) / 0.045, 0, 1);
      const alur2 = 1 - jepit(Math.abs(fbm(x * 4.6 + 11, y * 5.2, z * 4.6 - 5) - 0.5) / 0.03, 0, 1);
      const pori = derau(x * 52 + 7, y * 52, z * 52);
      const butir = derau(x * 12 + 2, y * 12, z * 12);
      const h = jepit(0.62 + 0.2 * (butir - 0.5) - 0.5 * Math.max(alur, alur2 * 0.6) - (pori > 0.78 ? 0.14 : 0), 0, 1);
      const k = (j * U + i) * 4;
      dt.data[k] = Math.round(h * 255);
      dt.data[k + 1] = Math.round(jepit(0.34 + 0.5 * Math.max(alur, alur2 * 0.7) + (pori > 0.78 ? 0.1 : 0), 0, 1) * 255);
      dt.data[k + 2] = 0; dt.data[k + 3] = 255;
      const terang = Math.round(jepit(1 - 0.34 * alur - 0.18 * alur2 + 0.14 * (butir - 0.5), 0, 1) * 255);
      dr.data[k] = terang; dr.data[k + 1] = terang; dr.data[k + 2] = terang; dr.data[k + 3] = 255;
    }
  }
  ct.putImageData(dt, 0, 0); cr.putImageData(dr, 0, 0);
  const tTinggi = new THREE.CanvasTexture(tinggi), tRupa = new THREE.CanvasTexture(rupa);
  for (const t of [tTinggi, tRupa]) { t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { tTinggi, tRupa };
}

function tumbuhkanJala() {
  const acak = acakBerbenih(8200), hasil = [];
  const PHI_AWAL = 0.14, PHI_AKHIR = 2.62;
  const tumbuh = (theta, phi, lebar, dalam, grup, condong) => {
    const titik = [{ theta, phi }];
    const panjang = 4 + Math.floor(acak() * 3) + (dalam === 0 ? 2 : 0);
    let arah = condong;
    for (let i = 0; i < panjang; i++) {
      phi += 0.062 + acak() * 0.028;
      arah += (acak() - 0.5) * 0.022;
      theta += arah / Math.max(0.4, Math.sin(phi));
      titik.push({ theta, phi });
      if (phi > PHI_AKHIR) break;
    }
    const berhenti = phi > PHI_AKHIR - 0.06 || dalam >= 4;
    hasil.push({ titik, lebar, grup, ujung: berhenti });
    if (berhenti) return;
    const sebar = 0.032 + acak() * 0.03;
    tumbuh(theta, phi, lebar * 0.78, dalam + 1, grup, arah + sebar);
    tumbuh(theta, phi, lebar * 0.78, dalam + 1, grup, arah - sebar);
  };
  for (let i = 0; i < JUMLAH_BATANG; i++) tumbuh((i / JUMLAH_BATANG) * Math.PI * 2 + (acak() - 0.5) * 0.2, PHI_AWAL, 0.07, 0, i, (acak() - 0.5) * 0.03);
  const tepi = hasil.filter((j) => j.lebar < 0.036);
  for (let k = 0; k < 72; k++) {
    const a = tepi[Math.floor(acak() * tepi.length)], b = tepi[Math.floor(acak() * tepi.length)];
    if (!a || !b || a === b) continue;
    const pa = a.titik[Math.floor(acak() * a.titik.length)];
    let terbaik = b.titik[0], jarak = Infinity;
    for (const pb of b.titik) {
      const d = Math.hypot((pa.theta - pb.theta) * Math.sin(pa.phi), pa.phi - pb.phi);
      if (d < jarak) { jarak = d; terbaik = pb; }
    }
    if (jarak < 0.05 || jarak > 0.2) continue;
    hasil.push({ titik: [pa, { theta: (pa.theta + terbaik.theta) / 2, phi: (pa.phi + terbaik.phi) / 2 + 0.012 }, terbaik], lebar: 0.012, grup: a.grup, ujung: false });
  }
  return hasil;
}
function buatJala(jalur) {
  const posisi = [], nilaiT = [], nilaiGrup = [], indeks = [];
  const p = new THREE.Vector3(), atas = new THREE.Vector3(), samping = new THREE.Vector3(), tangen = new THREE.Vector3();
  for (const j of jalur) {
    const kontrol = j.titik.map((t) => titikPermukaan(t.theta, t.phi, 1.012, new THREE.Vector3()));
    if (kontrol.length < 2) continue;
    const kurva = new THREE.CatmullRomCurve3(kontrol, false, "centripetal");
    const bagian = Math.max(6, kontrol.length * 5);
    const awal = posisi.length / 3;
    const phiAwal = j.titik[0].phi, phiAkhir = j.titik[j.titik.length - 1].phi;
    for (let i = 0; i <= bagian; i++) {
      const u = i / bagian;
      kurva.getPoint(u, p); kurva.getTangent(u, tangen);
      atas.copy(p).normalize();
      samping.crossVectors(tangen, atas).normalize();
      const runcing = j.ujung ? Math.sqrt(Math.min(1, (1 - u) * 2.6)) : 1;
      const lebar = j.lebar * THREE.MathUtils.lerp(1, 0.8, u) * runcing;
      const t = THREE.MathUtils.lerp(phiAwal, phiAkhir, u) / Math.PI;
      for (const sisi of [-1, 0, 1]) {
        const naik = sisi === 0 ? lebar * 0.55 : 0;
        posisi.push(p.x + samping.x * sisi * lebar + atas.x * naik, p.y + samping.y * sisi * lebar + atas.y * naik, p.z + samping.z * sisi * lebar + atas.z * naik);
        nilaiT.push(t); nilaiGrup.push(j.grup);
      }
    }
    for (let i = 0; i < bagian; i++) for (let s = 0; s < 2; s++) { const a = awal + i * 3 + s, b = a + 3; indeks.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(posisi, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(nilaiT, 1));
  geo.setAttribute("aGrup", new THREE.Float32BufferAttribute(nilaiGrup, 1));
  geo.setIndex(indeks);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Buah pala: dua belahan yang membuka, lalu larut menjadi bara ---------- */
const hash3 = (x, y, z) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function derau3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), fx), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), fx), fy),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), fx), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), fx), fy),
    fz,
  );
}
const DERAU_GLSL = /* glsl */ `
float hashL(vec3 p) { p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float derauL(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hashL(i), hashL(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hashL(i + vec3(0.0, 1.0, 0.0)), hashL(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hashL(i + vec3(0.0, 0.0, 1.0)), hashL(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hashL(i + vec3(0.0, 1.0, 1.0)), hashL(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float fbmL(vec3 p) { return derauL(p) * 0.55 + derauL(p * 2.1) * 0.3 + derauL(p * 4.3) * 0.15; }`;

function buatBuah(renderer) {
  const seragamBuah = { uLarut: { value: 0 } };
  // Kulit: warna + benjol dari derau di permukaan bola, jadi tanpa jahitan.
  const U = 256, V = 128;
  const kk = document.createElement("canvas"), kb = document.createElement("canvas");
  kk.width = kb.width = U; kk.height = kb.height = V;
  const gk = kk.getContext("2d"), gb = kb.getContext("2d");
  const ik = gk.createImageData(U, V), ib = gb.createImageData(U, V);
  for (let j = 0; j < V; j++) {
    const ph = ((j + 0.5) / V) * Math.PI, sp = Math.sin(ph), cp = Math.cos(ph);
    for (let i = 0; i < U; i++) {
      const th = ((i + 0.5) / U) * Math.PI * 2, x = sp * Math.cos(th), y = cp, z = sp * Math.sin(th);
      const besar = derau3(x * 2.3 + 5, y * 2.3, z * 2.3);
      const bintik = derau3(x * 64 + 1, y * 64, z * 64);
      const semu = derau3(x * 1.4 - 3, y * 1.4 + 2, z * 1.4);
      const hijau = Math.max(0, semu - 0.55) * 1.1, rona = Math.max(0, 0.42 - semu) * 0.9;
      const gelap = (bintik > 0.84 ? 0.18 : 0) + (besar - 0.5) * 0.14;
      const k = (j * U + i) * 4;
      ik.data[k] = 255 * jepit(1 - hijau * 0.12 - gelap, 0, 1);
      ik.data[k + 1] = 255 * jepit(1 - rona * 0.34 - gelap * 0.95, 0, 1);
      ik.data[k + 2] = 255 * jepit(1 - hijau * 0.3 - rona * 0.45 - gelap * 1.15, 0, 1);
      ik.data[k + 3] = 255;
      const h = 255 * jepit(0.6 + (besar - 0.5) * 0.5 - (bintik > 0.84 ? 0.22 : 0), 0, 1);
      ib.data[k] = h; ib.data[k + 1] = h; ib.data[k + 2] = h; ib.data[k + 3] = 255;
    }
  }
  gk.putImageData(ik, 0, 0); gb.putImageData(ib, 0, 0);
  const tKulit = new THREE.CanvasTexture(kk), tBenjol = new THREE.CanvasTexture(kb);
  tKulit.colorSpace = THREE.SRGBColorSpace;
  // Bidang belahan: rongga kecokelatan, daging krem berserat radial, tepi kulit kuning.
  const S = 192, ks = document.createElement("canvas"); ks.width = ks.height = S;
  const gs = ks.getContext("2d"), is = gs.createImageData(S, S);
  const wRongga = [0.78, 0.64, 0.42], wDaging = [0.97, 0.95, 0.83], wTepi = [0.84, 0.7, 0.3];
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = ((i + 0.5) / S) * 2 - 1, y = ((j + 0.5) / S) * 2 - 1, r = Math.hypot(x, y), a = Math.atan2(y, x);
    const t = jepit((r - 0.848) / 0.152, 0, 1);
    const serat = derau3(Math.cos(a) * 22, Math.sin(a) * 22, r * 2.5) - 0.5;
    const m1 = halus(jepit(t / 0.3, 0, 1)), m2 = halus(jepit((t - 0.86) / 0.14, 0, 1));
    const k = (j * S + i) * 4;
    for (let c = 0; c < 3; c++) is.data[k + c] = 255 * jepit((wRongga[c] + (wDaging[c] - wRongga[c]) * m1) * (1 - m2) + wTepi[c] * m2 + serat * 0.09, 0, 1);
    is.data[k + 3] = 255;
  }
  gs.putImageData(is, 0, 0);
  const tSerat = new THREE.CanvasTexture(ks); tSerat.colorSpace = THREE.SRGBColorSpace;
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  for (const t of [tKulit, tBenjol, tSerat]) t.anisotropy = aniso;
  tKulit.wrapS = tBenjol.wrapS = THREE.RepeatWrapping;

  // Larut: piksel di bawah ambang derau dibuang, tepinya menyala seperti bara.
  const larutkan = (m) => {
    m.onBeforeCompile = (s) => {
      s.uniforms.uLarut = seragamBuah.uLarut;
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vPosObj;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPosObj = position;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uLarut; varying vec3 vPosObj;\n" + DERAU_GLSL)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float nL = fbmL(vPosObj * 2.4);
          if (nL < uLarut * 1.02) discard;
          float bara = (1.0 - smoothstep(uLarut, uLarut + 0.06, nL)) * step(0.002, uLarut);
          totalEmissiveRadiance += vec3(1.0, 0.52, 0.18) * bara * 4.0;`);
    };
    return m;
  };
  const kulit = larutkan(new THREE.MeshPhysicalMaterial({
    color: 0xdcac5e, map: tKulit, bumpMap: tBenjol, bumpScale: 0.7, roughness: 0.7,
    sheen: 0.45, sheenColor: new THREE.Color(0xffd9a0), sheenRoughness: 0.55, clearcoat: 0.08, clearcoatRoughness: 0.5,
  }));
  const rongga = larutkan(new THREE.MeshStandardMaterial({ color: 0xd9c690, roughness: 0.92, side: THREE.BackSide }));
  const irisan = larutkan(new THREE.MeshStandardMaterial({ map: tSerat, roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color(0x8a7a52), emissiveMap: tSerat, emissiveIntensity: 0.55 }));
  const setengah = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.38, 72, 54, Math.PI / 2, Math.PI), kulit));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.17, 56, 42, Math.PI / 2, Math.PI), rongga));
    const iris = new THREE.Mesh(new THREE.RingGeometry(1.17, 1.38, 96, 3), irisan);
    iris.rotation.y = -Math.PI / 2;
    g.add(iris);
    return g;
  };
  const kanan = setengah(), kiri = setengah();
  kanan.scale.set(1, 1.08, 1);
  kiri.scale.set(-1, 1.08, 1);
  const buah = new THREE.Group();
  buah.add(kanan, kiri);
  return { buah, kanan, kiri, seragamBuah };
}

/* ---------- Serbuk: satu awan titik, empat bentuk ---------- */
function buatSerbuk(N) {
  const acak = acakBerbenih(2026);
  const gauss = () => Math.sqrt(-2 * Math.log(acak() + 1e-9)) * Math.cos(Math.PI * 2 * acak());
  const aOrbit = new Float32Array(N * 4), aB = new Float32Array(N * 4), aC = new Float32Array(N * 4), aD = new Float32Array(N * 4), aAcak = new Float32Array(N * 4);
  const wA = new Float32Array(N * 3), wB = new Float32Array(N * 3), wC = new Float32Array(N * 3), wD = new Float32Array(N * 3);
  const emas = warna(token("--orbit")), krem = warna("#fff0d6"), kilap = warna("#ff8d7a"), merah = warna(token("--aksen")), tinta2 = warna(token("--tinta-2"));
  const seri1 = warna("#e64a50"), seri3 = warna("#c58710"), merahIsi = warna(token("--aksen-isi"));
  const c = new THREE.Color();
  const tulis = (arr, i, col, k) => { arr[i * 3] = col.r * k; arr[i * 3 + 1] = col.g * k; arr[i * 3 + 2] = col.b * k; };

  // Tabel: kolom nama wilayah lebih lebar, 10 baris wilayah + 1 baris kepala.
  const KOL = 7, BAR = 11, lebarSel = [0.66, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4], tinggiSel = 0.13, jx = 0.1, jy = 0.12;
  const W = lebarSel.reduce((a, b) => a + b, 0) + jx * (KOL - 1), H = BAR * tinggiSel + (BAR - 1) * jy;
  const kiriKol = []; { let x = -W / 2; for (let k = 0; k < KOL; k++) { kiriKol.push(x); x += lebarSel[k] + jx; } }
  const kurva = (x) => 0.25 * x + 0.3 * Math.sin(1.9 * x + 0.7) + 0.09 * Math.sin(4.7 * x) - 0.05;
  const DASAR = -1.25;

  for (let i = 0; i < N; i++) {
    aAcak.set([acak(), acak(), acak(), acak()], i * 4);
    const debu = acak() < 0.14;
    // A: cincin padat di sekitar biji + piringan longgar; debu jauh tinggal di semua bentuk.
    if (debu && acak() < 0.13) {
      // Debu dekat kamera: tampil sebagai cakram bokeh besar.
      aOrbit.set([30, 0, 0, 0], i * 4);
      aB.set([(acak() * 2 - 1) * 4.6, (acak() * 2 - 1) * 2.8, 2.6 + acak() * 3.6, 0], i * 4);
      const pilihD = acak();
      tulis(wA, i, pilihD < 0.5 ? emas : pilihD < 0.8 ? kilap : krem, 0.28 + acak() * 0.25);
    } else if (debu) {
      const r = 5 + acak() * 7;
      aOrbit.set([r, acak() * Math.PI * 2, (acak() - 0.5) * 9, 0.004 + acak() * 0.004], i * 4);
      tulis(wA, i, krem, 0.18 + acak() * 0.22);
    } else {
      const pita = acak() < 0.46;
      const r = pita ? 2.02 + acak() * 0.52 + gauss() * 0.03 : 1.75 + Math.pow(acak(), 1.7) * 2.8;
      aOrbit.set([r, acak() * Math.PI * 2, gauss() * (pita ? 0.01 : 0.03) * r, 0.22 / Math.pow(r, 1.5)], i * 4);
      const pilih = acak();
      c.copy(pilih < 0.6 ? emas : pilih < 0.85 ? krem : kilap);
      const tepiPita = pita ? 1 - Math.abs(r - 2.28) / 0.3 : 0;
      tulis(wA, i, c, pita ? 0.55 + 0.6 * Math.max(0, tepiPita) : (0.4 + 0.45 * (1 - (r - 1.75) / 2.8)) * (0.6 + acak() * 0.5));
    }
    for (const arr of [wB, wC, wD]) { arr[i * 3] = wA[i * 3]; arr[i * 3 + 1] = wA[i * 3 + 1]; arr[i * 3 + 2] = wA[i * 3 + 2]; }
    if (debu) continue;

    // B: tabel. w = baris * 10 + kolom, dipakai sorot baris di shader.
    {
      const sel = Math.floor(acak() * KOL * BAR), kol = sel % KOL, bar = Math.floor(sel / KOL);
      const x0 = kiriKol[kol], y0 = H / 2 - bar * (tinggiSel + jy);
      let x, y;
      if (bar === 0) { x = x0 + acak() * lebarSel[kol]; y = y0 - tinggiSel * 0.5 + (acak() - 0.5) * 0.05; tulis(wB, i, emas, 0.9); }
      else if (kol === 0) { x = x0 + acak() * lebarSel[0] * (0.35 + 0.5 * ((bar * 0.37) % 1)); y = y0 - tinggiSel * 0.5 + (acak() - 0.5) * 0.045; tulis(wB, i, tinta2, 0.55); }
      else { x = x0 + acak() * lebarSel[kol]; y = y0 - acak() * tinggiSel; if (kol === 4) tulis(wB, i, merahIsi, 2.4); else tulis(wB, i, tinta2, 0.5); }
      aB.set([x, y, (acak() - 0.5) * 0.02, bar * 10 + kol], i * 4);
    }
    // C: kurva (0), bidang (1), sumbu (2), batang + titik data (3). Bentuk, bukan data.
    {
      const pilih = acak();
      if (pilih < 0.12) {
        const xs = -2.0 + Math.floor(acak() * 11) * 0.4, atas = kurva(xs);
        if (acak() < 0.32) { aC.set([xs + gauss() * 0.022, atas + gauss() * 0.022, gauss() * 0.022, 3], i * 4); tulis(wC, i, krem, 1.5); }
        else { aC.set([xs + gauss() * 0.005, DASAR + acak() * (atas - DASAR), gauss() * 0.006, 3], i * 4); tulis(wC, i, emas, 0.42); }
      } else {
        const x = (acak() * 2 - 1) * 2.2, y0 = kurva(x), u = (x + 2.2) / 4.4;
        c.copy(seri1).lerp(u < 0.6 ? seri3 : emas, u < 0.6 ? u / 0.6 : (u - 0.6) / 0.4);
        if (pilih < 0.58) { aC.set([x, y0 + gauss() * 0.012, gauss() * 0.26, 0], i * 4); tulis(wC, i, c, 1.25); }
        else if (pilih < 0.94) { const h = Math.pow(acak(), 0.7); aC.set([x, DASAR + h * (y0 - DASAR), gauss() * 0.26, 1], i * 4); tulis(wC, i, c, 0.08 + 0.28 * h); }
        else { aC.set([x, DASAR, gauss() * 0.01, 2], i * 4); tulis(wC, i, tinta2, 0.45); }
      }
    }
    // D: sepuluh gugus wilayah di cincin
    {
      if (acak() < 0.16) { aD.set([acak() * Math.PI * 2, gauss() * 0.02, gauss() * 0.012, -1], i * 4); tulis(wD, i, emas, 0.32); }
      else { const k = Math.floor(acak() * 10); aD.set([gauss() * 0.085, gauss() * 0.085, gauss() * 0.085, k], i * 4); c.copy(krem).lerp(emas, acak() * 0.7); tulis(wD, i, c, 0.95); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aOrbit", new THREE.BufferAttribute(aOrbit, 4));
  geo.setAttribute("aB", new THREE.BufferAttribute(aB, 4));
  geo.setAttribute("aC", new THREE.BufferAttribute(aC, 4));
  geo.setAttribute("aD", new THREE.BufferAttribute(aD, 4));
  geo.setAttribute("aAcak", new THREE.BufferAttribute(aAcak, 4));
  geo.setAttribute("aWarnaA", new THREE.BufferAttribute(wA, 3));
  geo.setAttribute("aWarnaB", new THREE.BufferAttribute(wB, 3));
  geo.setAttribute("aWarnaC", new THREE.BufferAttribute(wC, 3));
  geo.setAttribute("aWarnaD", new THREE.BufferAttribute(wD, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
  return { geo, tabel: { kiriKol, W, H, tinggiSel, jy } };
}

const VERTEKS_SERBUK = /* glsl */ `
uniform float uWaktu, uFase, uUkuran, uDpr, uMuncul, uBaris, uKepala, uKursorKuat, uFokus, uKabur;
uniform vec3 uKursor;
uniform mat3 uMiringA, uMiringB, uMiringD;
uniform vec4 uTataA, uTataB, uTataC, uTataD;
attribute vec4 aOrbit; attribute vec4 aB; attribute vec4 aC; attribute vec4 aD; attribute vec4 aAcak;
attribute vec3 aWarnaA, aWarnaB, aWarnaC, aWarnaD;
varying vec3 vWarna; varying float vAlfa; varying float vLunak;
vec3 posA() { float a = aOrbit.y + uWaktu * aOrbit.w; return uMiringA * vec3(cos(a) * aOrbit.x, aOrbit.z, sin(a) * aOrbit.x) * uTataA.w + uTataA.xyz; }
vec3 posB() { return uMiringB * aB.xyz * uTataB.w + uTataB.xyz; }
vec3 posC() {
  vec3 p = aC.xyz;
  float sumbu = step(1.5, aC.w) * step(aC.w, 2.5);
  p.y += 0.045 * sin(uWaktu * 0.9 + p.x * 2.6 + p.z * 3.0) * (1.0 - sumbu);
  return p * uTataC.w + uTataC.xyz;
}
vec3 posD() {
  float t = uWaktu * 0.05; vec3 p;
  if (aD.w < -0.5) { float a = aD.x + t; float r = 2.25 + aD.y; p = vec3(cos(a) * r, aD.z, sin(a) * r); }
  else { float a = aD.w / 10.0 * 6.2831853 + t; p = vec3(cos(a) * 2.25, 0.0, sin(a) * 2.25) + aD.xyz; }
  return uMiringD * p * uTataD.w + uTataD.xyz;
}
void main() {
  vec3 p; vec3 w; float ukuranBentuk = 1.0; float kilau = 0.0;
  if (aOrbit.x > 20.0) { p = aB.xyz + vec3(sin(uWaktu * 0.11 + aAcak.x * 6.28) * 0.35, cos(uWaktu * 0.09 + aAcak.y * 6.28) * 0.22, sin(uWaktu * 0.07 + aAcak.z * 6.28) * 0.3); w = aWarnaA; }
  else if (aOrbit.x > 4.9) { p = posA(); w = aWarnaA; }
  else {
    float fb = clamp(uFase, 0.0, 4.0);
    float i = min(floor(fb), 3.0);
    float t = smoothstep(0.0, 1.0, clamp((fb - i - aAcak.x * 0.3) / 0.7, 0.0, 1.0));
    vec3 p0; vec3 p1; vec3 w0; vec3 w1;
    if (i < 0.5) { p0 = posA(); p1 = posB(); w0 = aWarnaA; w1 = aWarnaB; }
    else if (i < 1.5) { p0 = posB(); p1 = posC(); w0 = aWarnaB; w1 = aWarnaC; }
    else if (i < 2.5) { p0 = posC(); p1 = posD(); w0 = aWarnaC; w1 = aWarnaD; }
    else { p0 = posD(); p1 = posA(); w0 = aWarnaD; w1 = aWarnaA; }
    p = mix(p0, p1, t);
    p += (aAcak.yzw - 0.5) * sin(t * 3.14159) * 0.75;
    w = mix(w0, w1, t);
    float k0 = i < 0.5 ? 1.0 : i < 1.5 ? 0.62 : i < 2.5 ? 0.85 : 1.0;
    float k1 = i < 0.5 ? 0.62 : i < 1.5 ? 0.85 : 1.0;
    ukuranBentuk = mix(k0, k1, t);
    // Sorot baris tabel yang sedang "dibaca" dan kepala yang menelusuri kurva.
    float bobotB = i < 0.5 ? t : (i < 1.5 ? 1.0 - t : 0.0);
    float bobotC = (i > 0.5 && i < 1.5) ? t : ((i > 1.5 && i < 2.5) ? 1.0 - t : 0.0);
    float bar = floor(aB.w / 10.0 + 0.001);
    float sorot = bar > 0.5 ? exp(-pow(bar - uBaris, 2.0) * 2.2) * bobotB : 0.0;
    float kepala = aC.w < 0.5 ? exp(-pow((aC.x - uKepala) * 2.6, 2.0)) * bobotC : 0.0;
    kilau = sorot * 1.6 + kepala * 1.3;
    ukuranBentuk *= 1.0 + sorot * 1.2 + kepala * 1.1;
  }
  w += vec3(1.0, 0.82, 0.62) * kilau;
  // Pembuka: serbuk datang dari kedalaman di belakang panggung (bukan dari depan kamera,
  // supaya tidak ada ribuan cakram bokeh besar sekaligus) lalu menyusut ke bentuknya.
  float muncul = 1.0 - pow(1.0 - uMuncul, 3.0);
  vec3 sebar = (aAcak.yzw - 0.5) * vec3(14.0, 9.0, 0.0);
  sebar.z = -4.0 - aAcak.w * 10.0;
  p = mix(p + sebar, p, muncul);
  // Kursor menyibak serbuk di sekitarnya.
  vec3 dk = p - uKursor;
  float dorong = uKursorKuat * exp(-dot(dk, dk) * 1.6);
  p += normalize(dk + vec3(0.0001)) * dorong * 0.65;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  // Kedalaman bidang: titik di luar fokus membesar dan meredup menjadi cakram bokeh.
  float jarak = -mv.z;
  float coc = clamp(abs(jarak - uFokus) * uKabur, 0.0, 5.0);
  gl_PointSize = min(uUkuran * ukuranBentuk * uDpr * (0.55 + aAcak.y * 0.9) * (8.0 / max(0.5, jarak)) * (1.0 + coc * 1.3), 96.0 * uDpr);
  vWarna = w;
  vAlfa = uMuncul * (0.7 + 0.3 * sin(uWaktu * 1.3 + aAcak.z * 40.0)) * (1.0 + dorong * 1.4) / (1.0 + coc * coc * 0.5);
  vLunak = clamp(coc / 2.4, 0.0, 1.0);
}`;
const FRAGMEN_SERBUK = /* glsl */ `
varying vec3 vWarna; varying float vAlfa; varying float vLunak;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float titik = pow(1.0 - d * 2.0, 1.6);
  float cakram = smoothstep(0.5, 0.38, d) * (0.5 + 0.5 * smoothstep(0.18, 0.46, d));
  float a = mix(titik, cakram * 0.6, vLunak);
  gl_FragColor = vec4(vWarna * a * vAlfa, 1.0);
}`;

const LATAR_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const LATAR_F = /* glsl */ `
uniform vec2 uPusat, uRes; uniform vec3 uDalam, uLatar, uPanggung, uAmber, uCahaya; uniform float uWaktu, uNyala, uSinar;
varying vec2 vUv;
float acak(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float derau(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(acak(i), acak(i + vec2(1.0, 0.0)), f.x), mix(acak(i + vec2(0.0, 1.0)), acak(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { s += a * derau(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main() {
  float rasio = uRes.x / uRes.y;
  vec2 q = vec2(vUv.x * rasio, vUv.y);
  vec2 p = vUv - uPusat; p.x *= rasio;
  float d = length(p);
  vec3 c = mix(uPanggung * uNyala, uLatar, smoothstep(0.0, 0.9, d));
  c = mix(c, uDalam, smoothstep(0.75, 1.7, d));
  // Kabut asap rempah yang bergeser pelan.
  float k1 = fbm(q * 1.6 + vec2(uWaktu * 0.012, -uWaktu * 0.008));
  float k2 = fbm(q * 3.1 - vec2(uWaktu * 0.02, 0.0) + k1 * 1.4);
  float asap = smoothstep(0.42, 0.88, k2);
  c += uPanggung * asap * 0.42 * (1.0 - smoothstep(0.1, 1.15, d));
  c += uAmber * pow(asap, 3.0) * 0.045 * (1.0 - smoothstep(0.0, 0.85, d));
  // Berkas cahaya dari balik biji; derau diambil di lingkaran satuan supaya tanpa jahitan sudut.
  vec2 arah = p / max(d, 0.0001);
  float s1 = derau(arah * 3.0 + vec2(uWaktu * 0.03, 0.0));
  float s2 = derau(arah * 7.0 - vec2(0.0, uWaktu * 0.05) + 4.0);
  float berkas = pow(s1 * 0.6 + s2 * 0.4, 4.0) * smoothstep(1.1, 0.16, d) * smoothstep(0.04, 0.3, d);
  c += uCahaya * berkas * uSinar * 0.3;
  gl_FragColor = vec4(c, 1.0);
}`;

/* Lapisan film: vinyet, butir, dan geser warna tipis di tepi. Bekerja di ruang tampilan (sesudah OutputPass). */
const FILM_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FILM_F = /* glsl */ `
uniform sampler2D tDiffuse; uniform float uWaktu; uniform vec2 uRes;
varying vec2 vUv;
float acak(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 q = vUv - 0.5;
  float r = dot(q, q);
  vec2 geser = q * r * 0.008;
  vec3 c = vec3(texture2D(tDiffuse, vUv + geser).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - geser).b);
  c *= 1.0 - smoothstep(0.12, 0.62, r) * 0.42;
  c += (acak(vUv * uRes + fract(uWaktu * 3.1) * 91.0) - 0.5) * 0.032;
  gl_FragColor = vec4(c, 1.0);
}`;

const JARI_V = `attribute float aU; attribute float aGeser; varying float vU; varying float vGeser;
void main() { vU = aU; vGeser = aGeser; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const JARI_F = `uniform vec3 uWarna; uniform float uKuat, uWaktu; varying float vU; varying float vGeser;
void main() {
  float jalan = fract(uWaktu * 0.32 + vGeser);
  float nadi = exp(-pow((vU - jalan) * 10.0, 2.0));
  float a = (0.16 + nadi * 1.1) * smoothstep(0.05, 0.3, vU) * uKuat;
  gl_FragColor = vec4(uWarna * a, 1.0);
}`;

const FASE_KETERANGAN = [0, 1, 2, 2.5, 3, 4];
const KETERANGAN = [
  "",
  "Tabel: kepala + 10 baris kabupaten/kota. Bentuk, bukan data",
  "Kurva dan batang: ilustrasi, bukan angka sebenarnya",
  "",
  "10 gugus = 10 kabupaten/kota, berkode wilayah BPS",
  "Biji pala (Myristica fragrans) dan fulinya",
];

function mulai() {
  const ponsel = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true, powerPreference: "high-performance" });
  const dpr = Math.min(devicePixelRatio || 1, ponsel ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(new THREE.Color(token("--latar")));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const latarMat = new THREE.ShaderMaterial({
    vertexShader: LATAR_V, fragmentShader: LATAR_F, depthWrite: false, depthTest: false,
    uniforms: {
      uPusat: { value: new THREE.Vector2(0.69, 0.5) }, uRes: { value: new THREE.Vector2(1, 1) }, uWaktu: { value: 0 }, uNyala: { value: 1 },
      uDalam: { value: warna(token("--latar-dalam")) }, uLatar: { value: warna(token("--latar")) },
      uPanggung: { value: warna(token("--panggung-gelap")) }, uAmber: { value: warna(token("--orbit")) },
      uCahaya: { value: warna(token("--panggung-terang")) }, uSinar: { value: 1 },
    },
  });
  const latar = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), latarMat);
  latar.frustumCulled = false; latar.renderOrder = -10;
  scene.add(latar);

  const kunci = new THREE.DirectionalLight(0xfff0d6, 2.8); kunci.position.set(-3, 4, 5);
  const tepi = new THREE.DirectionalLight(0xff3b4a, 4.2); tepi.position.set(4, 1.5, -4);
  const tepi2 = new THREE.DirectionalLight(0xe3c388, 1.4); tepi2.position.set(-4.5, -2, -3);
  scene.add(kunci, tepi, tepi2, new THREE.HemisphereLight(0xffe8d0, 0x2a0a10, 0.35));

  /* Biji + jala */
  const pala = new THREE.Group();
  const { tTinggi, tRupa } = buatTeksturBiji();
  tTinggi.anisotropy = tRupa.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const biji = new THREE.Mesh(
    buatBiji(warna("#2b100c"), warna("#7a4228")),
    new THREE.MeshPhysicalMaterial({
      vertexColors: true, map: tRupa, bumpMap: tTinggi, bumpScale: 1.3, roughnessMap: tTinggi, roughness: 1, metalness: 0,
      clearcoat: 0.35, clearcoatRoughness: 0.32, sheen: 0.3, sheenColor: new THREE.Color(0xd9a27a), sheenRoughness: 0.6,
    })
  );
  const seragam = { uTumbuh: { value: kurang ? 1 : 0 }, uWaktu: { value: 0 }, uDenyut: { value: 0.5 } };
  const jalaMat = new THREE.MeshPhysicalMaterial({
    color: 0xc30f2b, roughness: 0.34, sheen: 0.9, sheenColor: new THREE.Color(0xff8d7a), sheenRoughness: 0.35,
    clearcoat: 0.6, clearcoatRoughness: 0.22, emissive: new THREE.Color(0x3a0006), side: THREE.DoubleSide,
  });
  jalaMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, seragam);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aT; attribute float aGrup; varying float vT; varying float vGrup;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvT = aT; vGrup = aGrup;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTumbuh, uWaktu, uDenyut; varying float vT; varying float vGrup;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        if (vT > uTumbuh) discard;
        // Pangkal jala lebih tua dan gelap, ujungnya merah segar; tepinya tembus cahaya.
        diffuseColor.rgb *= mix(0.6, 1.12, smoothstep(0.04, 0.8, vT));
        float tepiF = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.4);
        float depan = smoothstep(uTumbuh - 0.05, uTumbuh, vT) * (1.0 - smoothstep(0.8, 0.9, uTumbuh));
        float nadi = pow(max(0.0, sin(vT * 22.0 - uWaktu * 2.0 + vGrup * 0.785)), 14.0) * uDenyut;
        totalEmissiveRadiance += vec3(1.0, 0.5, 0.38) * (depan * 3.0 + nadi * 1.6) + vec3(1.0, 0.3, 0.26) * tepiF * 0.32;`);
  };
  const jala = new THREE.Mesh(buatJala(tumbuhkanJala()), jalaMat);
  pala.add(biji, jala);
  pala.rotation.z = 0.24;
  scene.add(pala);

  /* Buah pala yang membelah */
  const { buah, kanan, kiri, seragamBuah } = buatBuah(renderer);
  scene.add(buah);

  /* Kata "fuli" raksasa jauh di belakang biji, seperti tanda air panggung aplikasi */
  let teksBesar = null;
  const buatTeksBesar = () => {
    const c = document.createElement("canvas"); c.width = 2048; c.height = 768;
    const g = c.getContext("2d");
    g.font = 'italic 300 560px "Piazzolla Variable", Georgia, serif';
    g.textAlign = "center"; g.fillStyle = "#ffffff"; g.fillText("fuli", 1024, 560);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    teksBesar = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshBasicMaterial({ map: t, color: warna(token("--panggung-terang")), transparent: true, opacity: 0, depthWrite: false }));
    teksBesar.renderOrder = -5;
    scene.add(teksBesar);
  };
  const muatHuruf = document.fonts && document.fonts.load ? document.fonts.load('italic 300 120px "Piazzolla Variable"').catch(() => null) : Promise.resolve();
  muatHuruf.then(() => { try { buatTeksBesar(); } catch (e) { console.warn("Kata latar tidak dibuat.", e); } });

  /* Garis orbit seperti panggung aplikasi */
  const orbitMat = new THREE.LineBasicMaterial({ color: warna(token("--orbit")), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const elips = (rx, rz, n = 256) => new THREE.BufferGeometry().setFromPoints(Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz); }));
  const orbit1 = new THREE.LineLoop(elips(1.85, 1.85), orbitMat); orbit1.rotation.set(0.32, 0, 0.26);
  const orbit2 = new THREE.LineLoop(elips(2.12, 1.95), orbitMat); orbit2.rotation.set(1.12, 0.25, -0.42);
  const orbitGrup = new THREE.Group(); orbitGrup.add(orbit1, orbit2); scene.add(orbitGrup);

  /* Serbuk */
  const N = ponsel ? 7000 : 15000;
  const { geo: serbukGeo, tabel } = buatSerbuk(N);
  const miringB = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.08, -0.5, 0.02)));
  const miringD = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.42, 0, -0.08)));
  const serbukMat = new THREE.ShaderMaterial({
    vertexShader: VERTEKS_SERBUK, fragmentShader: FRAGMEN_SERBUK,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uWaktu: { value: 0 }, uFase: { value: 0 }, uUkuran: { value: ponsel ? 2.4 : 2.1 }, uDpr: { value: dpr }, uMuncul: { value: kurang ? 1 : 0 },
      uBaris: { value: 9 }, uKepala: { value: 0.8 }, uKursor: { value: new THREE.Vector3(99, 99, 99) }, uKursorKuat: { value: 0 }, uFokus: { value: 8 }, uKabur: { value: ponsel ? 0.24 : 0.3 },
      uMiringA: { value: new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.3, 0, 0.26))) },
      uMiringB: { value: miringB }, uMiringD: { value: miringD },
      uTataA: { value: new THREE.Vector4() }, uTataB: { value: new THREE.Vector4() }, uTataC: { value: new THREE.Vector4() }, uTataD: { value: new THREE.Vector4() },
    },
  });
  const serbuk = new THREE.Points(serbukGeo, serbukMat);
  serbuk.frustumCulled = false;
  scene.add(serbuk);

  /* Benang dari biji ke sepuluh gugus wilayah */
  const jariGeo = new THREE.BufferGeometry();
  jariGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(20 * 3), 3));
  jariGeo.setAttribute("aU", new THREE.BufferAttribute(Float32Array.from({ length: 20 }, (_, k) => k % 2), 1));
  jariGeo.setAttribute("aGeser", new THREE.BufferAttribute(Float32Array.from({ length: 20 }, (_, k) => Math.floor(k / 2) * 0.137), 1));
  const jariMat = new THREE.ShaderMaterial({
    vertexShader: JARI_V, fragmentShader: JARI_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uWarna: { value: warna(token("--orbit")) }, uKuat: { value: 0 }, uWaktu: { value: 0 } },
  });
  const jari = new THREE.LineSegments(jariGeo, jariMat);
  jari.frustumCulled = false;
  scene.add(jari);

  /* Pascaproses: cahaya lembut, lalu lapisan film */
  const komposer = new EffectComposer(renderer);
  komposer.addPass(new RenderPass(scene, camera));
  const mekar = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.86);
  mekar.enabled = !ponsel;
  komposer.addPass(mekar);
  komposer.addPass(new OutputPass());
  const film = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uWaktu: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } }, vertexShader: FILM_V, fragmentShader: FILM_F });
  komposer.addPass(film);

  /* Bingkai kunci per fase: [x, y, z, skala biji, jarak kamera] */
  const TATA = {
    lebar: {
      // [x, y, z, skala biji, jarak kamera, geser kamera x, geser kamera y, z bidang fokus]
      biji: [[1.95, 0.0, 0, 0.8, 8.2, 0, 0.05, 0], [3.05, 1.25, 0.6, 0.38, 8.6, -0.7, 0.7, -0.6], [3.0, 1.35, -0.6, 0.36, 8.4, 0.5, -0.25, -0.4], [1.45, 0.0, 0.0, 0.5, 8.0, 0, 1.5, 0], [1.85, 0.0, 0.5, 0.9, 7.9, 0.25, 0.15, 0.4]],
      buka: [0.5, 0.34, -0.42], teks: [2.1, -0.4, -4.2, 1.3],
      A: [1.9, 0.0, 0, 0.95], B: [1.95, -0.05, -0.8, 0.96], C: [1.65, -0.2, -0.4, 0.82], D: [1.45, 0.0, 0.0, 0.74], fov: 35,
    },
    tegak: {
      biji: [[0, 1.8, 0, 0.5, 10.0, 0, 0.05, 0], [0.85, 2.15, 0.4, 0.28, 10.4, -0.4, 0.5, -0.5], [0.85, 2.2, -0.3, 0.28, 10.2, 0.3, -0.2, -0.2], [0, 1.2, 0, 0.42, 9.8, 0, 1.2, 0], [0, 1.6, 0.3, 0.5, 9.8, 0.15, 0.1, 0.3]],
      buka: [0.55, 0.34, -0.42], teks: [0, 1.75, -4.2, 0.55],
      A: [0, 1.6, 0, 0.5], B: [0, 1.25, -0.5, 0.48], C: [0, 1.05, -0.2, 0.42], D: [0, 1.2, 0, 0.5], fov: 38,
    },
  };
  let tata = TATA.lebar;
  const kerangka = [0, 0, 0, 1, 8, 0, 0, 0];
  const vFokus = new THREE.Vector3();
  function sisip(kunciKunci, f, keluar) {
    const i = Math.min(Math.floor(f), kunciKunci.length - 2), t = halus(jepit(f - i, 0, 1));
    const a = kunciKunci[i], b = kunciKunci[i + 1];
    for (let k = 0; k < a.length; k++) keluar[k] = a[k] + (b[k] - a[k]) * t;
    return keluar;
  }

  /* Label: sepuluh gugus wilayah (fase I) dan baris tabel yang sedang dibaca (fase F) */
  const WILAYAH = WILAYAH_BPS;
  const wadah = document.getElementById("wilayah");
  const label = WILAYAH.map(([kode, nama]) => {
    const s = document.createElement("span");
    const b = document.createElement("b"); b.textContent = kode;
    s.appendChild(b); s.appendChild(document.createTextNode(nama.replace(/^Kota /, "")));
    wadah.appendChild(s); return s;
  });
  const labelBaris = document.createElement("span");
  labelBaris.className = "baris";
  wadah.appendChild(labelBaris);
  let barisTertulis = -1;
  const keterangan = document.getElementById("keterangan-teks");
  const keteranganWadah = document.getElementById("keterangan");
  let keteranganTertulis = -1;
  const vLabel = new THREE.Vector3(), vTata = new THREE.Vector3(), vPusatGugus = new THREE.Vector3();
  const pusatGugus = (k, w, keluar) => {
    const a = (k / 10) * Math.PI * 2 + w * 0.05;
    return keluar.set(Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25).applyMatrix3(miringD).multiplyScalar(tata.D[3]).add(vTata.set(tata.D[0], tata.D[1], tata.D[2]));
  };

  /* Fase dari posisi gulir: titik tengah tiap bab = satu fase */
  let jangkar = [];
  function ukurJangkar() {
    jangkar = Array.from(document.querySelectorAll("[data-fase]")).map((el) => ({ y: el.offsetTop + el.offsetHeight / 2, f: Number(el.dataset.fase) }));
  }
  function faseDariGulir() {
    const y = scrollY + innerHeight / 2;
    if (!jangkar.length || y <= jangkar[0].y) return jangkar.length ? jangkar[0].f : 0;
    for (let i = 0; i < jangkar.length - 1; i++) {
      const a = jangkar[i], b = jangkar[i + 1];
      if (y <= b.y) return a.f + (b.f - a.f) * ((y - a.y) / (b.y - a.y));
    }
    return jangkar[jangkar.length - 1].f;
  }

  let lebar = 1, tinggi = 1, tegak = false, jauhAspek = 1;
  function ukur() {
    lebar = innerWidth; tinggi = innerHeight;
    tegak = lebar < 760 || lebar / tinggi < 0.9;
    tata = tegak ? TATA.tegak : TATA.lebar;
    jauhAspek = tegak ? 1 : jepit(1.6 / (lebar / tinggi), 1, 1.4);
    renderer.setSize(lebar, tinggi, false);
    komposer.setPixelRatio(dpr); komposer.setSize(lebar, tinggi);
    camera.aspect = lebar / tinggi; camera.fov = tata.fov; camera.updateProjectionMatrix();
    latarMat.uniforms.uRes.value.set(lebar, tinggi);
    film.uniforms.uRes.value.set(lebar * dpr, tinggi * dpr);
    serbukMat.uniforms.uTataA.value.fromArray(tata.A);
    serbukMat.uniforms.uTataB.value.fromArray(tata.B);
    serbukMat.uniforms.uTataC.value.fromArray(tata.C);
    serbukMat.uniforms.uTataD.value.fromArray(tata.D);
    ukurJangkar();
    mintaGambar();
  }

  /* Penunjuk: paralaks untuk semua, sibakan serbuk hanya untuk tetikus */
  const penunjuk = new THREE.Vector2(), penunjukHalus = new THREE.Vector2();
  const sinar = new THREE.Raycaster(), bidang = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
  let tetikus = false, kuatKursor = 0;
  addEventListener("pointermove", (e) => {
    penunjuk.set((e.clientX / lebar) * 2 - 1, (e.clientY / tinggi) * 2 - 1);
    tetikus = e.pointerType === "mouse";
  }, { passive: true });
  document.addEventListener("mouseleave", () => { tetikus = false; });
  addEventListener("blur", () => { tetikus = false; });

  let fase = 0, waktu = 0, sebelum = performance.now(), awal = sebelum, jalan = false, siap = false;
  const vPusat = new THREE.Vector3();
  function gambar(kini) {
    jalan = false;
    const dtMentah = (kini - sebelum) / 1000; sebelum = kini;
    const dt = Math.min(0.05, dtMentah), dtKejar = Math.min(0.25, dtMentah);
    const umur = (kini - awal) / 1000;
    const target = faseDariGulir();
    fase = kurang ? target : fase + (target - fase) * (1 - Math.exp(-dtKejar * 3.2));
    if (!kurang) waktu += dt;

    // Urutan pembuka: serbuk menyusut ke orbit, kamera mendekat, jala tumbuh dari pangkal.
    const pembuka = kurang ? 1 : keluarKubik(jepit(umur / 2.6, 0, 1));
    if (!kurang) {
      serbukMat.uniforms.uMuncul.value = jepit(umur / 2.2, 0, 1);
      seragam.uTumbuh.value = 0.02 + 0.98 * keluarKubik(jepit((umur - 0.7) / 2.8, 0, 1));
    }
    serbukMat.uniforms.uWaktu.value = waktu;
    serbukMat.uniforms.uFase.value = fase;
    serbukMat.uniforms.uBaris.value = kurang ? 9 : 1 + ((waktu * 0.7) % 10);
    serbukMat.uniforms.uKepala.value = kurang ? 0.8 : -2.4 + ((waktu * 0.2) % 1) * 4.8;
    seragam.uWaktu.value = waktu;
    seragam.uDenyut.value = 0.35 + 0.65 * Math.max(0, 1 - Math.abs(fase - 2) * 1.2);
    latarMat.uniforms.uWaktu.value = waktu;
    latarMat.uniforms.uSinar.value = 0.45 + 0.55 * Math.max(Math.max(0, 1 - fase * 1.3), Math.max(0, 1 - (4 - fase) * 1.3));
    film.uniforms.uWaktu.value = kurang ? 0 : umur;

    sisip(tata.biji, jepit(fase, 0, 4), kerangka);
    const masuk = kurang ? 1 : 0.82 + 0.18 * keluarKubik(jepit(umur / 1.8, 0, 1));
    pala.position.set(kerangka[0], kerangka[1], kerangka[2]);
    pala.scale.setScalar(kerangka[3] * masuk);
    penunjukHalus.lerp(penunjuk, kurang ? 1 : 1 - Math.exp(-dt * 3));
    pala.rotation.y = waktu * 0.16 + fase * 0.9 + penunjukHalus.x * 0.3 + (1 - pembuka) * -1.2;
    pala.rotation.x = -0.1 + penunjukHalus.y * 0.14 + Math.sin(waktu * 0.4) * 0.03;

    camera.position.set(kerangka[5] + penunjukHalus.x * 0.32, kerangka[6] - penunjukHalus.y * 0.2, kerangka[4] * jauhAspek + (1 - pembuka) * 2.4);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // Orbit tipis hanya di pembuka dan penutup.
    orbitGrup.position.copy(pala.position);
    orbitGrup.scale.setScalar(kerangka[3] * masuk);
    orbit1.rotation.y = waktu * 0.05; orbit2.rotation.y = -waktu * 0.035;
    orbitMat.opacity = 0.34 * pembuka * Math.max(Math.max(0, 1 - fase * 1.6), Math.max(0, 1 - (4 - fase) * 1.6));
    serbukMat.uniforms.uFokus.value = camera.position.distanceTo(vFokus.set(kerangka[0], kerangka[1], kerangka[7]));

    // Buah: membelah di pembuka, menjauh dan larut menjadi bara menuju bab F, kembali utuh di penutup.
    const bukaIntro = kurang ? 1 : keluarKubik(jepit((umur - 0.35) / 2.2, 0, 1));
    const pergi = fase < 2 ? halus(jepit(fase / 0.85, 0, 1)) : 1 - halus(jepit((fase - 3.15) / 0.85, 0, 1));
    const larut = jepit((pergi - 0.1) / 0.72, 0, 1);
    seragamBuah.uLarut.value = larut;
    buah.visible = larut < 0.995;
    if (buah.visible) {
      buah.position.copy(pala.position);
      buah.scale.setScalar(kerangka[3] * masuk);
      const geser = 0.03 + tata.buka[0] * bukaIntro + 1.5 * pergi, miring = tata.buka[1] * bukaIntro + 0.6 * pergi;
      kanan.position.x = geser; kanan.rotation.z = -miring;
      kiri.position.x = -geser; kiri.rotation.z = miring;
      buah.rotation.set(0.06 + penunjukHalus.y * 0.05, tata.buka[2] + penunjukHalus.x * 0.1 + Math.sin(waktu * 0.3) * 0.04, 0.05);
    }
    if (teksBesar) {
      const kuatT = Math.max(Math.max(0, 1 - fase * 1.4), Math.max(0, 1 - (4 - fase) * 1.4)) * pembuka;
      teksBesar.visible = kuatT > 0.01;
      teksBesar.material.opacity = 0.42 * kuatT;
      teksBesar.position.set(tata.teks[0] - penunjukHalus.x * 0.25, tata.teks[1], tata.teks[2]);
      teksBesar.scale.setScalar(tata.teks[3]);
    }

    // Sibakan kursor di bidang z = 0.
    if (tetikus && !kurang) {
      sinar.setFromCamera(ndc.set(penunjuk.x, -penunjuk.y), camera);
      sinar.ray.intersectPlane(bidang, serbukMat.uniforms.uKursor.value);
    }
    kuatKursor += ((tetikus && !kurang ? 1 : 0) - kuatKursor) * (1 - Math.exp(-dt * 4));
    serbukMat.uniforms.uKursorKuat.value = kuatKursor;

    // Pusat cahaya latar mengikuti biji di layar.
    vPusat.copy(pala.position).project(camera);
    latarMat.uniforms.uPusat.value.set(vPusat.x * 0.5 + 0.5, vPusat.y * 0.5 + 0.5);

    // Fase I: label gugus dan benang dari biji.
    const kuatD = Math.max(0, 1 - Math.abs(fase - 3) * 2.4);
    jariMat.uniforms.uKuat.value = kuatD;
    jariMat.uniforms.uWaktu.value = waktu;
    if (kuatD > 0.01) {
      const pos = jariGeo.attributes.position;
      for (let k = 0; k < 10; k++) {
        pusatGugus(k, waktu, vPusatGugus);
        pos.setXYZ(k * 2, pala.position.x, pala.position.y, pala.position.z);
        pos.setXYZ(k * 2 + 1, vPusatGugus.x, vPusatGugus.y, vPusatGugus.z);
        if (!tegak && label[k]) {
          vLabel.set(Math.cos((k / 10) * Math.PI * 2 + waktu * 0.05) * 2.25, 0, Math.sin((k / 10) * Math.PI * 2 + waktu * 0.05) * 2.25).applyMatrix3(miringD);
          const depan = jepit(0.55 + (vLabel.z / 2.25) * 0.45, 0.45, 1);
          vLabel.copy(vPusatGugus).project(camera);
          const x = (vLabel.x * 0.5 + 0.5) * lebar, y = (-vLabel.y * 0.5 + 0.5) * tinggi;
          label[k].style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, calc(-100% - 34px))`;
          label[k].style.opacity = (kuatD * depan).toFixed(3);
        }
      }
      pos.needsUpdate = true;
    }
    if ((kuatD <= 0.01 || tegak) && label.length && label[0].style.opacity !== "0") label.forEach((s) => (s.style.opacity = "0"));

    // Fase F: nama wilayah di baris tabel yang sedang disorot.
    const kuatB = tegak ? 0 : Math.max(0, 1 - Math.abs(fase - 1) * 2.4);
    if (kuatB > 0.01) {
      const r = jepit(Math.floor(serbukMat.uniforms.uBaris.value + 0.5), 1, 10);
      if (r !== barisTertulis && WILAYAH[r - 1]) {
        barisTertulis = r;
        labelBaris.textContent = "";
        const b = document.createElement("b"); b.textContent = WILAYAH[r - 1][0];
        labelBaris.appendChild(b); labelBaris.appendChild(document.createTextNode(WILAYAH[r - 1][1]));
      }
      const y0 = tabel.H / 2 - r * (tabel.tinggiSel + tabel.jy) - tabel.tinggiSel * 0.5;
      vLabel.set(tabel.kiriKol[0], y0, 0).applyMatrix3(miringB).multiplyScalar(tata.B[3]).add(vTata.set(tata.B[0], tata.B[1], tata.B[2])).project(camera);
      const x = (vLabel.x * 0.5 + 0.5) * lebar, y = (-vLabel.y * 0.5 + 0.5) * tinggi;
      labelBaris.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(calc(-100% - 14px), -50%)`;
      labelBaris.style.opacity = kuatB.toFixed(3);
    } else if (labelBaris.style.opacity !== "0") labelBaris.style.opacity = "0";

    // Keterangan panggung mengikuti bab terdekat; disembunyikan saat pita terang menutup panggung.
    let iKet = 0;
    for (let k = 1; k < FASE_KETERANGAN.length; k++) if (Math.abs(fase - FASE_KETERANGAN[k]) < Math.abs(fase - FASE_KETERANGAN[iKet])) iKet = k;
    if (iKet !== keteranganTertulis) { keteranganTertulis = iKet; keterangan.textContent = KETERANGAN[iKet]; }
    keteranganWadah.style.opacity = KETERANGAN[iKet] ? (1 - Math.min(1, Math.abs(fase - FASE_KETERANGAN[iKet]) * 2.4)).toFixed(3) : "0";

    komposer.render(dt);
    if (!siap) { siap = true; akar.classList.add("ada-3d"); }
    if (!kurang && !document.hidden) mintaGambar();
    else if (kurang && Math.abs(target - fase) > 0.001) mintaGambar();
  }
  function mintaGambar() { if (!jalan) { jalan = true; requestAnimationFrame(gambar); } }

  addEventListener("resize", ukur);
  addEventListener("scroll", mintaGambar, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { sebelum = performance.now(); mintaGambar(); } });
  kanvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); akar.classList.remove("ada-3d"); akar.classList.add("tanpa-3d"); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ukurJangkar);
  if ("ResizeObserver" in window) new ResizeObserver(ukurJangkar).observe(document.querySelector("main"));
  ukur();
}

let sudah = false;

export function mulaiAdegan() {
  if (sudah) return;
  sudah = true;
  try { mulai(); }
  catch (galat) { akar.classList.remove("ada-3d"); akar.classList.add("tanpa-3d"); console.warn("Panggung 3D Fuli tidak bisa dimulai, tanda statis dipakai.", galat); }
}
