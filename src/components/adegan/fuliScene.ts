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

function buatBiji(gelap: THREE.Color, terang: THREE.Color): THREE.BufferGeometry {
  const lebar = 96;
  const geo = new THREE.SphereGeometry(1, lebar, 72);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const warna = new Float32Array(pos.count * 3);
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
  const PHI_AKHIR = 2.62;

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
    tumbuh(theta, PHI_AWAL, 0.07, 0, i, (acak() - 0.5) * 0.03);
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
    const kontrol = j.titik.map((t) => titikPermukaan(t.theta, t.phi, 1.012, new THREE.Vector3()));
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

/** Pori halus dan alur kering memberi biji permukaan alami tanpa aset luar. */
function buatTeksturBiji() {
  const ukuran = 256;
  const data = new Uint8Array(ukuran * ukuran * 4);
  const acak = acakBerbenih(1729);
  for (let y = 0; y < ukuran; y++) {
    for (let x = 0; x < ukuran; x++) {
      const theta = (x / ukuran) * Math.PI * 2;
      const phi = (y / ukuran) * Math.PI;
      const alur = Math.sin(theta * 38 + Math.sin(phi * 11) * 2.8);
      const halus = Math.sin(theta * 89 + Math.sin(phi * 23)) * 0.13;
      const n = Math.round(146 + alur * 31 + halus * 25 + (acak() - 0.5) * 40);
      const i = (y * ukuran + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = n;
      data[i + 3] = 255;
    }
  }
  const tekstur = new THREE.DataTexture(data, ukuran, ukuran, THREE.RGBAFormat);
  tekstur.wrapS = THREE.RepeatWrapping;
  tekstur.minFilter = THREE.LinearMipmapLinearFilter;
  tekstur.magFilter = THREE.LinearFilter;
  tekstur.generateMipmaps = true;
  tekstur.needsUpdate = true;
  return tekstur;
}

/** Busur elips mengelilingi pala seperti ilustrasi orbit pada atlas lama. */
function buatOrbit(): THREE.BufferGeometry {
  const posisi: number[] = [];
  const nilaiT: number[] = [];
  const nilaiOrbit: number[] = [];
  const indeks: number[] = [];
  const titik = new THREE.Vector3();
  const rotasi = [
    new THREE.Euler(0.82, -0.34, -0.36),
    new THREE.Euler(-0.66, 0.72, 0.64),
    new THREE.Euler(0.18, -0.78, -0.28),
  ];
  for (let j = 0; j < rotasi.length; j++) {
    const awal = posisi.length / 3;
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      const a = t * Math.PI * 1.76 + j * 1.7;
      titik.set(Math.cos(a) * (1.6 + j * 0.12), Math.sin(a) * (1.54 + j * 0.12), 0);
      titik.applyEuler(rotasi[j]);
      posisi.push(titik.x, titik.y, titik.z);
      nilaiT.push(t);
      nilaiOrbit.push(j);
      if (i < 160) indeks.push(awal + i, awal + i + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(posisi, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(nilaiT, 1));
  geo.setAttribute("aOrbit", new THREE.Float32BufferAttribute(nilaiOrbit, 1));
  geo.setIndex(indeks);
  return geo;
}

export function buatAdeganFuli(o: Opsi): AdeganFuli {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.kanvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    o.padaGagal?.();
    return { aturModus() {}, aturTema() {}, aturKerja() {}, aturTahap() {}, sentak() {}, bersihkan() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));

  // Token dibaca dari kanvas agar tema halaman dan material selalu selaras.
  const warnaToken = (nama: string, cadangan: string) => {
    const nilai = getComputedStyle(o.kanvas).getPropertyValue(nama).trim();
    return new THREE.Color(nilai || cadangan);
  };
  const scene = new THREE.Scene();
  const FOV = 30;
  const JARAK = 9;
  const kamera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  kamera.position.z = JARAK;

  const langit = new THREE.HemisphereLight(0xffefdb, 0x361015, 1.25);
  const utama = new THREE.DirectionalLight(0xfff0d6, 3.7);
  utama.position.set(-3.4, 4.5, 5);
  const tepi = new THREE.DirectionalLight(0xff3b4a, 3.2);
  tepi.position.set(3.2, -0.6, -2);
  const tepiEmas = new THREE.DirectionalLight(0xffdfaa, 3.4);
  tepiEmas.position.set(-1.5, 3.2, -2.5);
  const isi = new THREE.DirectionalLight(0xffc9b4, 1.05);
  isi.position.set(2, -2, 4);
  scene.add(langit, utama, tepi, tepiEmas, isi);

  const akar = new THREE.Group();
  const putar = new THREE.Group();
  akar.add(putar);
  scene.add(akar);
  putar.rotation.set(0.15, 0.7, -0.32);

  let geoBiji = buatBiji(warnaToken("--pala-gelap", "#2b100c"), warnaToken("--pala-terang", "#7a4228"));
  const teksturBiji = buatTeksturBiji();
  const bahanBiji = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    bumpMap: teksturBiji,
    bumpScale: 0.042,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.48,
    clearcoatRoughness: 0.32,
  });
  const biji = new THREE.Mesh(geoBiji, bahanBiji);
  putar.add(biji);

  const seragam = {
    uWaktu: { value: 0 },
    uDenyut: { value: 0 },
    uTahap: { value: 0 },
    uPanas: { value: warnaToken("--jala-kilap", "#ff8d7a") },
  };
  const geoJala = buatJala(tumbuhkanJala());
  const bahanJala = new THREE.MeshPhysicalMaterial({
    color: warnaToken("--jala-merah", "#c30f2b"),
    roughness: 0.37,
    metalness: 0.02,
    sheen: 0.8,
    sheenColor: warnaToken("--jala-kilap", "#ff8d7a"),
    sheenRoughness: 0.4,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
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
        "#include <common>\nuniform float uWaktu;\nuniform float uDenyut;\nuniform float uTahap;\nuniform vec3 uPanas;\nvarying float vT;\nvarying float vGrup;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float gelombang = fract(vT * 2.4 - uWaktu * 0.22 + vGrup * 0.183);
        float kilat = smoothstep(0.0, 0.05, gelombang) * (1.0 - smoothstep(0.05, 0.2, gelombang));
        float nyala = step(vGrup + 0.5, uTahap) * 0.18;
        totalEmissiveRadiance += uPanas * (kilat * uDenyut * 0.42 + nyala * uDenyut);`,
      );
  };
  putar.add(new THREE.Mesh(geoJala, bahanJala));
  o.kanvas.dataset.segitigaJala = String((geoJala.index?.count ?? 0) / 3);

  const seragamOrbit = {
    uWaktu: { value: 0 },
    uBuka: { value: o.modus === "hero" ? 1 : 0 },
    uWarna: { value: warnaToken("--orbit", "#e3c388") },
  };
  const geoOrbit = buatOrbit();
  const bahanOrbit = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: seragamOrbit,
    vertexShader: `attribute float aT; attribute float aOrbit; varying float vT; varying float vOrbit;
      void main(){ vT=aT; vOrbit=aOrbit; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uWaktu; uniform float uBuka; uniform vec3 uWarna; varying float vT; varying float vOrbit;
      void main(){ float bordir=smoothstep(0.0,0.09,vT)*(1.0-smoothstep(0.84,1.0,vT));
      float kilap=pow(0.5+0.5*cos(vT*12.0-uWaktu*0.3+vOrbit*2.0),8.0);
      gl_FragColor=vec4(uWarna,(0.28+kilap*0.37)*bordir*uBuka);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const orbit = new THREE.LineSegments(geoOrbit, bahanOrbit);
  akar.add(orbit);

  let modus: ModusAdegan = o.modus;
  let tema: TemaAdegan = o.tema;
  let kerja = false;
  let tahapTarget = 0;
  let sentakan = 0;
  let waktu = 0;
  let sudut = 0.7;
  let sudutCepat = 0.045;
  let dipasang = true;
  let konteksHilang = false;
  let sudahSiap = false;
  let raf = 0;
  let terakhirGambar = 0;
  let w = 0;
  let h = 0;
  let px = 0;
  let py = 0;
  let pxLembut = 0;
  let pyLembut = 0;
  let frameLambat = 0;
  let sampel = 0;

  const terapkanTema = () => {
    utama.color.copy(warnaToken("--cahaya-hangat", "#fff0d6"));
    tepi.color.copy(warnaToken("--cahaya-tepi", "#ff3b4a"));
    tepiEmas.color.copy(warnaToken("--cahaya-hangat", "#fff0d6"));
    bahanJala.color.copy(warnaToken("--jala-merah", "#c30f2b"));
    bahanJala.sheenColor.copy(warnaToken("--jala-kilap", "#ff8d7a"));
    seragam.uPanas.value.copy(warnaToken("--jala-kilap", "#ff8d7a"));
    seragamOrbit.uWarna.value.copy(warnaToken("--orbit", "#e3c388"));
    langit.intensity = tema === "dark" ? 1.1 : 1.25;
  };
  terapkanTema();

  const ukur = () => {
    const nw = window.innerWidth;
    const nh = window.innerHeight;
    if (nw !== w || nh !== h) {
      w = nw;
      h = nh;
      renderer.setSize(w, h, false);
      kamera.aspect = w / Math.max(h, 1);
      kamera.updateProjectionMatrix();
    }
    mintaGambar();
  };
  const padaPenunjuk = (e: PointerEvent) => {
    px = (e.clientX / (w || 1)) * 2 - 1;
    py = (e.clientY / (h || 1)) * 2 - 1;
  };
  const padaHilang = (e: Event) => {
    e.preventDefault();
    konteksHilang = true;
    cancelAnimationFrame(raf);
    raf = 0;
    o.padaGagal?.();
  };
  const padaVisibilitas = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      terakhirGambar = 0;
      mintaGambar();
    }
  };

  function mintaGambar() {
    if (dipasang && !konteksHilang && !document.hidden && raf === 0) raf = requestAnimationFrame(gambar);
  }

  function gambar(now: number) {
    raf = 0;
    if (!dipasang || konteksHilang || document.hidden) return;
    if (!o.gerakDikurangi) mintaGambar();
    // Kecepatan dibatasi juga di hero: gerak tenang tidak memerlukan 60 gambar/detik.
    const batas = kerja ? 1000 / 40 : 1000 / 30;
    if (!o.gerakDikurangi && terakhirGambar && now - terakhirGambar < batas - 1) return;
    const dt = terakhirGambar ? Math.min(0.08, (now - terakhirGambar) / 1000) : 1 / 30;
    terakhirGambar = now;
    if (!o.gerakDikurangi && sampel < 90) {
      sampel++;
      if (dt > 0.055) frameLambat++;
      if (sampel === 90 && frameLambat > 40) {
        renderer.setPixelRatio(1);
        renderer.setSize(w, h, false);
      }
    }
    const ikuti = o.gerakDikurangi ? 1 : 1 - Math.exp(-dt * 3);
    if (!o.gerakDikurangi) {
      waktu += dt;
      sudutCepat += ((kerja ? 0.2 : 0.045) - sudutCepat) * ikuti;
      sudut += sudutCepat * dt;
      sentakan *= Math.exp(-dt * 3.4);
      pxLembut += (px - pxLembut) * ikuti;
      pyLembut += (py - pyLembut) * ikuti;
    }
    seragam.uWaktu.value = waktu;
    seragam.uDenyut.value += ((o.gerakDikurangi ? 0 : kerja ? 0.8 : 0.06) - seragam.uDenyut.value) * ikuti;
    seragam.uTahap.value += (tahapTarget - seragam.uTahap.value) * ikuti;
    seragamOrbit.uWaktu.value = waktu;
    seragamOrbit.uBuka.value += ((modus === "hero" ? 1 : 0) - seragamOrbit.uBuka.value) * ikuti;
    orbit.visible = seragamOrbit.uBuka.value > 0.005;
    orbit.rotation.z = o.gerakDikurangi ? 0 : Math.sin(waktu * 0.08) * 0.075;

    // Ukuran dan posisi dibaca langsung: transisi tata letak tetap mengikuti CSS.
    const k = o.jangkar.getBoundingClientRect();
    const tinggiDunia = 2 * JARAK * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const perPx = tinggiDunia / (h || 1);
    const tx = (k.left + k.width / 2 - w / 2) * perPx;
    const ty = (h / 2 - (k.top + k.height / 2)) * perPx;
    const skala = (Math.max(k.width, 1) * perPx) / (2 * TERAPAN.b * 1.04);
    akar.position.set(tx, ty + (o.gerakDikurangi ? 0 : Math.sin(waktu * 0.64) * 0.035 * skala), 0);
    akar.scale.setScalar(skala * (1 + sentakan * 0.025));
    akar.visible = k.width > 0 && k.height > 0;
    putar.rotation.y = sudut + pxLembut * 0.15;
    putar.rotation.x = 0.15 + pyLembut * 0.09;

    renderer.render(scene, kamera);
    if (!sudahSiap) {
      sudahSiap = true;
      o.padaSiap?.();
    }
  }

  ukur();
  const pengamat = new ResizeObserver(() => mintaGambar());
  pengamat.observe(o.jangkar);
  window.addEventListener("resize", ukur);
  window.addEventListener("scroll", mintaGambar, { passive: true });
  document.addEventListener("visibilitychange", padaVisibilitas);
  if (!o.gerakDikurangi) window.addEventListener("pointermove", padaPenunjuk, { passive: true });
  o.kanvas.addEventListener("webglcontextlost", padaHilang);

  return {
    aturModus(m) {
      modus = m;
      mintaGambar();
    },
    aturTema(t) {
      tema = t;
      terapkanTema();
      const sebelumnya = geoBiji;
      geoBiji = buatBiji(warnaToken("--pala-gelap", "#2b100c"), warnaToken("--pala-terang", "#7a4228"));
      biji.geometry = geoBiji;
      sebelumnya.dispose();
      mintaGambar();
    },
    aturKerja(k) {
      kerja = k;
      mintaGambar();
    },
    aturTahap(n) {
      tahapTarget = Math.min(JUMLAH_BATANG, Math.max(0, n));
      mintaGambar();
    },
    sentak() {
      if (!o.gerakDikurangi) sentakan = 1;
    },
    bersihkan() {
      if (!dipasang) return;
      dipasang = false;
      cancelAnimationFrame(raf);
      raf = 0;
      pengamat.disconnect();
      window.removeEventListener("resize", ukur);
      window.removeEventListener("scroll", mintaGambar);
      window.removeEventListener("pointermove", padaPenunjuk);
      document.removeEventListener("visibilitychange", padaVisibilitas);
      o.kanvas.removeEventListener("webglcontextlost", padaHilang);
      geoBiji.dispose();
      geoJala.dispose();
      geoOrbit.dispose();
      teksturBiji.dispose();
      bahanBiji.dispose();
      bahanJala.dispose();
      bahanOrbit.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
    },
  };
}
