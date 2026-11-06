# Uji antarmuka dengan data buatan

Fixture ini tidak membaca backend produksi, berkas lingkungan, atau data pengguna. Seluruh isi disimpan dalam memori dan hilang ketika proses dihentikan. Angka serta sumber selalu bertanda **UJI**. Token fixture tidak memiliki otoritas dan hanya dipakai untuk memenuhi bentuk kontrak parser.

Jalankan pemeriksaan kontrak fixture terlebih dahulu:

```sh
node tests/fixture-uji.mjs
```

Jalankan fixture pada terminal khusus:

```sh
node tests/backend-uji.mjs
```

Jalankan salinan aplikasi lokal pada terminal lain. Penetapan `BACKEND_BASE_URL` wajib agar aplikasi memakai data buatan:

```sh
BACKEND_BASE_URL=http://127.0.0.1:6072 npx next dev -p 6071 -H 127.0.0.1
```

Kemudian jalankan uji Chromium mandiri:

```sh
FULI_TEST_URL=http://127.0.0.1:6071 node tests/browser-uji.mjs
```

Skrip memakai Chromium yang sudah terpasang di `/usr/bin/chromium`, CDP, dan WebSocket bawaan Node 22. Tidak ada instalasi browser atau dependency tambahan. Profil dan grup proses sementara dibuat terpisah lalu dibersihkan setelah uji, termasuk saat startup gagal atau runner menerima SIGINT/SIGTERM. `CHROMIUM_PATH` dapat menunjuk Chromium lokal lain. `FULI_TEST_TIMEOUT` mengatur batas tunggu polling dan CDP dalam milidetik (bawaan 60000); startup menunggu setidaknya 60 detik. `FULI_TEST_OUTPUT` boleh menunjuk direktori untuk menyimpan tangkapan layar hero desktop terang/gelap, percakapan desktop, hero/percakapan ponsel, reduced-motion, dan fallback WebGL; bila tidak diatur, tangkapan tidak disimpan.

Pemeriksaan browser mencakup aliran status dan teks parsial hingga `done`, pergantian grafik/tabel, riwayat setelah muat ulang, galat dan pengiriman ulang, penghentian sebelum teks pertama, lebar 390 px, preferensi pengurangan gerak, jalur SVG ketika WebGL tidak tersedia, dan exception JavaScript yang tidak ditangani. Pemeriksaan pengurangan gerak memverifikasi preferensi dan fungsi chat; penilaian estetika serta laju bingkai perangkat nyata tetap perlu pemeriksaan visual.

Untuk memeriksa secara manual, buka aplikasi lokal dengan profil uji kosong. Kirim pertanyaan apa pun untuk jawaban sintetis biasa, `uji-gagal` untuk galat pertama yang berhasil setelah **Kirim ulang**, atau `uji-lambat` untuk jeda sembilan detik sebelum teks pertama. Pada kasus lambat, tekan **Hentikan jawaban** selama status membaca tampil. Muat ulang jawaban biasa dan pastikan tabel/grafik serta riwayat tetap tersedia. Periksa juga tombol tema, laci riwayat di ponsel, fokus keyboard, kontras, dan bentuk biji 3D. Gunakan emulasi reduced-motion serta blokir konteks WebGL hanya pada profil uji untuk memeriksa tampilan pengganti.

Hentikan kedua server lokal setelah pemeriksaan. Jangan arahkan skrip ini ke produksi: runner hanya menerima alamat loopback dan menunggu token fixture bertanda `uji.`.
