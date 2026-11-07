// Isi statis halaman muka. Disimpan sebagai HTML (bukan JSX) supaya sama persis dengan rancangan yang diuji;
// perilakunya dipasang oleh hidupkan.ts dan adeganBeranda.ts sesudah halaman terhidrasi.
export const MARKUP = String.raw`
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <clipPath id="klip-biji"><ellipse cx="32" cy="32" rx="25.5" ry="27" transform="rotate(-24 32 32)"/></clipPath>
    <symbol id="tanda" viewBox="0 0 64 64">
      <ellipse cx="32" cy="32" rx="25.5" ry="27" transform="rotate(-24 32 32)" style="fill:var(--tanda-biji)"/>
      <path d="M46 12.6 C50 15.4 53 19.4 54.4 24" fill="none" stroke-width="2.4" stroke-linecap="round" style="stroke:var(--tanda-tangkai)"/>
      <g clip-path="url(#klip-biji)" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--tanda-jala)">
        <circle cx="22.4" cy="54.8" r="4.4" stroke="none" style="fill:var(--tanda-jala)"/>
        <path d="M21 55 C13 47 9.5 37 12 27 C13.5 20.5 17.5 15 23 11.5" stroke-width="4.2"/>
        <path d="M11.8 30 C16.4 29.6 20 26.6 22 21.6" stroke-width="2.8"/>
        <path d="M18.6 27.4 C21.8 29.6 25.2 29.2 28 26.6" stroke-width="2"/>
        <path d="M16.8 16.6 C20 17.6 24 16.6 27.4 14" stroke-width="2"/>
        <path d="M22 55 C25 47 28.8 39.6 33.6 33 C37.4 27.8 41.6 23.4 47 19.6" stroke-width="4"/>
        <path d="M29.4 39 C34.4 40 39.6 38.4 44 34" stroke-width="2.8"/>
        <path d="M39.6 26.4 C38.4 21 39 15.6 42 11" stroke-width="2.6"/>
        <path d="M44 34 C47.8 33 51 30.4 53.4 26.4" stroke-width="2"/>
        <path d="M36.8 37.6 C38.4 41 41.2 43.4 45 44.4" stroke-width="2"/>
        <path d="M24 55.4 C32 55.8 40 53.6 46 49 C50 46 52.6 42.4 54.4 38" stroke-width="3.8"/>
        <path d="M36 54 C35.6 50.6 33.6 47.6 30.4 45.8" stroke-width="2.4"/>
        <path d="M47 48.2 C46.6 45.6 48.4 43.4 51 42.6" stroke-width="2"/>
      </g>
    </symbol>
    <symbol id="ikon-bintang" viewBox="0 0 24 24"><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7"/></g></symbol>
    <symbol id="ikon-dok" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></g></symbol>
    <symbol id="ikon-panah-atas" viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="ikon-panah-kanan" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="ikon-panah-bawah" viewBox="0 0 24 24"><path d="M12 5v14m-6-6 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="ikon-centang" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  </defs>
</svg>

<canvas id="adegan" aria-hidden="true"></canvas>
<div class="cadangan" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#tanda"/></svg></div>
<div class="wilayah" id="wilayah" aria-hidden="true"></div>
<div class="garis-maju" id="garis-maju" aria-hidden="true"></div>
<p class="keterangan" id="keterangan" aria-hidden="true"><span>Panggung</span><span id="keterangan-teks">Serbuk fuli mengorbit biji pala</span></p>

<header class="kepala" id="kepala">
  <a class="merek" href="#awal" aria-label="Fuli, ke awal halaman">
    <svg viewBox="0 0 64 64" aria-hidden="true"><use href="#tanda"/></svg><span>Fuli</span>
  </a>
  <nav class="navigasi" aria-label="Bab">
    <a href="#fakta"><b>F</b>Fakta</a>
    <a href="#uraian"><b>U</b>Uraian</a>
    <a href="#literasi"><b>L</b>Literasi</a>
    <a href="#indikator"><b>I</b>Indikator</a>
  </nav>
  <a class="tombol tombol-utama" href="/tanya">
    <span>Tanya Fuli</span><svg aria-hidden="true"><use href="#ikon-panah-kanan"/></svg>
  </a>
</header>

<nav class="rel" id="rel" aria-label="Bab Fuli">
  <a href="#fakta" title="Fakta">F</a>
  <a href="#uraian" title="Uraian">U</a>
  <a href="#literasi" title="Literasi">L</a>
  <a href="#indikator" title="Indikator">I</a>
</nav>

<main>
  <section class="bab pahlawan" id="awal" data-fase="0">
    <div class="isi">
      <div class="kolom">
        <p class="alis"><svg aria-hidden="true"><use href="#ikon-bintang"/></svg>Data BPS Maluku Utara, dalam percakapan</p>
        <h1>Kenali Maluku Utara, <em>lewat data.</em></h1>
        <p class="pengantar">Tanyakan inflasi Kota Ternate, kemiskinan per kabupaten/kota, atau IPM lima tahun terakhir. Fuli menjawab dari data dan publikasi BPS Provinsi Maluku Utara, lalu menyertakan sumbernya.</p>
        <form class="tanya" id="tanya" action="/tanya" method="get">
          <label class="label-tersembunyi" for="tanya-isi">Tulis pertanyaan untuk Fuli</label>
          <span class="ketik" id="ketik" aria-hidden="true">Inflasi Kota Ternate bulan ini</span>
          <textarea id="tanya-isi" rows="1" maxlength="1000" autocomplete="off" enterkeyhint="send" placeholder="Tulis pertanyaan tentang data Maluku Utara"></textarea>
          <span class="chip-data"><svg aria-hidden="true"><use href="#ikon-dok"/></svg>Data BPS Maluku Utara</span>
          <button class="kirim" type="submit" aria-label="Kirim pertanyaan ke Fuli"><svg aria-hidden="true"><use href="#ikon-panah-atas"/></svg></button>
        </form>
        <div class="coba" id="coba">
          <span>Coba tanyakan</span>
          <button type="button" id="coba-1" data-i="0" aria-pressed="true">Inflasi Ternate</button>
          <button type="button" id="coba-2" data-i="1" aria-pressed="false">Kemiskinan</button>
          <button type="button" id="coba-3" data-i="2" aria-pressed="false">IPM</button>
          <button type="button" id="coba-4" data-i="3" aria-pressed="false">Ekspor nikel</button>
        </div>
      </div>
    </div>
    <div class="kaki-pahlawan isi">
      <span><i>Myristica fragrans</i>, biji pala dan fulinya</span>
      <a class="gulir" href="#fakta">Gulir untuk melihat cara kerjanya<svg aria-hidden="true"><use href="#ikon-panah-bawah"/></svg></a>
    </div>
  </section>

  <section class="bab" id="fakta" data-fase="1">
    <div class="isi">
      <div class="kolom">
        <div class="kepala-bab"><p class="huruf" aria-hidden="true">F</p><p class="label">Fakta</p></div>
        <h2>Berangkat dari tabel resmi.</h2>
        <p class="teks">Sebelum menulis jawaban, Fuli mencari angkanya di tabel statistik, Berita Resmi Statistik, dan publikasi BPS Provinsi Maluku Utara. Sepuluh baris di tabel itu adalah sepuluh kabupaten/kota.</p>
        <ul class="sumber-daftar">
          <li><span>Tabel statistik</span><span>angka per wilayah dan periode</span></li>
          <li><span>Berita Resmi Statistik</span><span>rilis terbaru, mis. inflasi dan TPT</span></li>
          <li><span>Publikasi</span><span>Maluku Utara Dalam Angka dan lainnya</span></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="bab" id="uraian" data-fase="2">
    <div class="isi">
      <div class="kolom">
        <div class="kepala-bab"><p class="huruf" aria-hidden="true">U</p><p class="label">Uraian</p></div>
        <h2>Angka diurai menjadi cerita.</h2>
        <p class="teks">Satu angka jarang cukup. Fuli menyebut periode dan satuannya, menjelaskan artinya dalam beberapa kalimat, dan menggambar grafik bila datanya berderet.</p>
        <p class="catatan"><b>IPM adalah indeks</b>, jadi Fuli tidak menempelkan tanda persen padanya. Tanda persen hanya muncul bila sumbernya memakai persen.</p>
      </div>
    </div>
  </section>

  <section class="pita" id="literasi" data-fase="2.5">
    <div class="isi">
      <div class="kolom">
        <div class="kepala-bab"><p class="huruf" aria-hidden="true">L</p><p class="label">Literasi</p></div>
        <h2>Bahasa sehari-hari, untuk siapa saja.</h2>
        <p class="teks">Bertanyalah seperti kepada petugas Pelayanan Statistik Terpadu. Fuli menjawab dalam kalimat biasa dan menaruh sumbernya di bawah jawaban, jadi Anda bisa memeriksanya sendiri.</p>
      </div>
      <figure class="obrolan" aria-label="Contoh percakapan dengan Fuli" style="margin:0">
        <div class="obrolan-kepala">
          <span class="merek"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#tanda"/></svg><span>Fuli</span></span>
          <small>Contoh percakapan</small>
        </div>
        <p class="pesan-saya">Berapa tingkat pengangguran terbuka Maluku Utara Agustus 2026?</p>
        <div class="jawab">
          <svg viewBox="0 0 64 64" aria-hidden="true"><use href="#tanda"/></svg>
          <div class="jawab-isi">
            <span class="langkah"><svg aria-hidden="true"><use href="#ikon-centang"/></svg>4 langkah kerja</span>
            <p>Tingkat pengangguran terbuka (TPT) Maluku Utara pada Agustus 2026 sebesar <span class="angka">4,57 persen</span>. Angka ini berasal dari Survei Angkatan Kerja Nasional (Sakernas) Agustus 2026.</p>
            <div class="sumber-baris">
              <span>Sumber</span>
              <span class="chip"><svg aria-hidden="true"><use href="#ikon-dok"/></svg>Berita Resmi Statistik, 5 November 2026</span>
            </div>
          </div>
        </div>
        <figcaption class="obrolan-kaki">Fuli bisa keliru. Periksa kembali angka penting di sumbernya.</figcaption>
      </figure>
    </div>
  </section>

  <section class="bab" id="indikator" data-fase="3">
    <div class="isi">
      <div class="kolom">
        <div class="kepala-bab"><p class="huruf" aria-hidden="true">I</p><p class="label">Indikator</p></div>
        <h2>Sepuluh kabupaten/kota, satu tempat bertanya.</h2>
        <p class="teks">Tanyakan satu wilayah, atau minta Fuli membandingkan semuanya. Topik yang paling sering ditanyakan:</p>
        <div class="topik">
          <span>Harga &amp; inflasi</span><span>Kemiskinan</span><span>Pembangunan manusia</span>
          <span>Ketenagakerjaan</span><span>Kependudukan</span><span>Ekonomi &amp; perdagangan</span>
        </div>
        <ul class="kabkota" id="kabkota" aria-label="Kabupaten/kota di Maluku Utara beserta kode wilayah BPS"><li><b>8201</b><span>Halmahera Barat</span></li><li><b>8202</b><span>Halmahera Tengah</span></li><li><b>8203</b><span>Kepulauan Sula</span></li><li><b>8204</b><span>Halmahera Selatan</span></li><li><b>8205</b><span>Halmahera Utara</span></li><li><b>8206</b><span>Halmahera Timur</span></li><li><b>8207</b><span>Pulau Morotai</span></li><li><b>8208</b><span>Pulau Taliabu</span></li><li><b>8271</b><span>Kota Ternate</span></li><li><b>8272</b><span>Kota Tidore Kepulauan</span></li></ul>
      </div>
    </div>
  </section>

  <section class="bab penutup" id="nama" data-fase="4">
    <div class="isi">
      <div class="kolom">
        <p class="label">Tentang nama</p>
        <h2>Fuli adalah <em>jala merah</em> yang membungkus biji pala.</h2>
        <p class="teks">Di Maluku Utara, pala adalah hasil kebun yang akrab. Selaput merah pembungkus bijinya disebut fuli dan dijual sebagai rempah tersendiri. Namanya juga kependekan dari Fakta, Uraian, dan Literasi Indikator.</p>
        <div class="aksi">
          <a class="tombol tombol-utama" href="/tanya">Mulai bertanya<svg aria-hidden="true"><use href="#ikon-panah-kanan"/></svg></a>
          <a class="tombol tombol-kedua" href="https://malut.bps.go.id" target="_blank" rel="noopener">Situs BPS Maluku Utara</a>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="kaki">
  <div class="isi">
    <span>BPS Provinsi Maluku Utara</span>
    <span>Data dan publikasi resmi, dalam percakapan.</span>
    <span>Fuli bisa keliru. Periksa kembali angka penting di sumbernya.</span>
  </div>
</footer>
`;
