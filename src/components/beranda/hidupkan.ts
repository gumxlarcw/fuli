// @ts-nocheck -- porting langsung dari rancangan halaman muka yang diuji (landing/index.html).
// Bagian tanpa 3D: mesin ketik, kotak tanya, rel bab, garis maju. Tetap jalan walau WebGL gagal.
let sudah = false;

export function hidupkanBeranda() {
  if (sudah) return;
  sudah = true;

  var kurang = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PERTANYAAN = [
    "Inflasi Kota Ternate bulan ini",
    "Tingkat kemiskinan per kabupaten/kota",
    "IPM Maluku Utara 5 tahun terakhir",
    "Ekspor nikel Maluku Utara per bulan"
  ];
  var ketik = document.getElementById("ketik");
  var tombol = Array.prototype.slice.call(document.querySelectorAll("#coba button"));
  var indeks = 0, panjang = PERTANYAAN[0].length, mode = "tahan", pewaktu = 0;
  function tandai() { tombol.forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === indeks)); }); }
  function langkah() {
    var teks = PERTANYAAN[indeks];
    if (mode === "ketik") {
      panjang++; ketik.textContent = teks.slice(0, panjang);
      if (panjang >= teks.length) { mode = "tahan"; pewaktu = setTimeout(langkah, 2400); return; }
      pewaktu = setTimeout(langkah, 34 + Math.random() * 40); return;
    }
    if (mode === "tahan") { mode = "hapus"; pewaktu = setTimeout(langkah, 30); return; }
    panjang--; ketik.textContent = teks.slice(0, Math.max(0, panjang));
    if (panjang <= 0) { indeks = (indeks + 1) % PERTANYAAN.length; tandai(); mode = "ketik"; pewaktu = setTimeout(langkah, 260); return; }
    pewaktu = setTimeout(langkah, 16);
  }
  var bentuk = document.getElementById("tanya");
  var isian = document.getElementById("tanya-isi");
  function berhentiKetik() { clearTimeout(pewaktu); pewaktu = 0; }
  function tinggikan() {
    isian.style.height = "auto";
    isian.style.height = Math.min(isian.scrollHeight, 168) + "px";
    bentuk.classList.toggle("diisi", isian.value.length > 0);
  }
  tombol.forEach(function (b) {
    b.addEventListener("click", function () {
      berhentiKetik();
      indeks = Number(b.dataset.i); tandai();
      ketik.textContent = PERTANYAAN[indeks];
      isian.value = PERTANYAAN[indeks];
      tinggikan();
      if (matchMedia("(min-width: 900px)").matches) isian.focus();
    });
  });
  isian.addEventListener("input", tinggikan);
  isian.addEventListener("focus", berhentiKetik);
  // Kotak dikosongkan lalu ditinggal: mesin ketik contoh berjalan lagi.
  isian.addEventListener("blur", function () {
    if (!isian.value && !kurang && !pewaktu) pewaktu = setTimeout(langkah, 1200);
  });
  isian.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); bentuk.requestSubmit(); }
  });
  // Pertanyaan dibawa ke /tanya lewat sessionStorage (bukan URL), supaya tautan tidak bisa memicu kiriman.
  bentuk.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = (isian.value.trim() || PERTANYAAN[indeks]).slice(0, 1000);
    try { sessionStorage.setItem("fuli_tanya_awal", t); } catch (_) { /* tanpa penyimpanan: /tanya dibuka kosong */ }
    location.assign("/tanya");
  });
  if (!kurang) pewaktu = setTimeout(langkah, 2600);

  /* Rel bab, garis maju, kepala tergulir */
  var rel = Array.prototype.slice.call(document.querySelectorAll("#rel a"));
  var kepala = document.getElementById("kepala");
  var maju = document.getElementById("garis-maju");
  var dijadwalkan = false;
  function segarkan() {
    dijadwalkan = false;
    var h = document.documentElement.scrollHeight - innerHeight;
    maju.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")";
    kepala.classList.toggle("tergulir", scrollY > 40);
    var tengah = innerHeight / 2, aktif = null;
    rel.forEach(function (a) {
      var el = document.querySelector(a.getAttribute("href"));
      var r = el.getBoundingClientRect();
      if (r.top <= tengah && r.bottom >= tengah) aktif = a;
    });
    rel.forEach(function (a) { a.setAttribute("aria-current", String(a === aktif)); });
  }
  addEventListener("scroll", function () { if (!dijadwalkan) { dijadwalkan = true; requestAnimationFrame(segarkan); } }, { passive: true });
  addEventListener("resize", segarkan);
  segarkan();
}
