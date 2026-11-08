<!-- alias: fuli, malika-chat -->
# Fuli

Fuli (Fakta, Uraian, dan Literasi Indikator) adalah muka chat data BPS Maluku Utara di
`https://fuli.bpsmalut.com`. Pengganti nama MALIKA; fuli = jala merah pembungkus biji pala.

Sejak 7 November 2026 (commit `b0f748d`): `/` = halaman muka 3D, `/tanya` = ruang tanya (chat).
Aplikasi terpasang (manifest `start_url`) membuka `/tanya`.

**Sejak 8 November 2026 (perintah pemilik): portal lama `malika.bpsmalut.com` DITUTUP dari publik** (ingress edge dicabut;
pds-frontend tetap hidup untuk akses lokal di app `127.0.0.1:6060` / tailnet `100.77.217.52:6060`). Fuli hanya chat: jangan
memindahkan halaman portal (data, dashboard, peta tematik, BRS, publikasi, pencarian) ke Fuli, dan jangan menautkan ke portal.
Tautan relatif dari backend (mis. `candidates[].href = /data?source_id=`) ditampilkan sebagai teks (`tautanAman`, commit `233d687`).

## Di mana

| Apa | Di mana |
|---|---|
| Aplikasi hidup | `app:/opt/public/fuli`, milik `app-public`, PM2 `fuli`, bind `10.82.7.8:6070` |
| Git | `/var/lib/git-fleet/public_fuli.git`; sumber kerja `ops:/home/ops/kerja/fuli-20261105/app` |
| Jalan masuk | `edge:/etc/cloudflared/config.yml`, ufw `6070/tcp` hanya dari `10.82.7.9` |
| Otak | `pds-backend` (`app:/opt/internal/project-data-strategis/backend`, tailnet `:5000`), agen Hermes `pds-*` di `ops` |
| Rahasia | `.env.production.local` mode 600, hanya `BACKEND_BASE_URL`. Tidak ada kunci di peramban |

## Aturan yang mengikat

- Proksi `src/app/api/[...path]/route.ts` memakai daftar izin metode + jalur. Rute baru harus ditambahkan sadar, batas badan 64 KB.
- Nama agen Hermes tidak pernah tampil di UI.
- Pengenal teknis sengaja tetap: `malika_ui`, `x-malika-uid`, `x-malika-token`, `MALIKA_*`. Mengubahnya berarti mengubah kontrak dengan backend.
- Warna dan ukuran hanya dari `src/styles/tokens.css`. Grafik memakai `--seri-1..6` (lolos validator terang dan gelap); jangan tambah warna seri.
- Tanda persen hanya bila sumber menyebutnya (`formatTerbukti` di `src/lib/olah.ts`). Rentang 0 sampai 100 bukan bukti: IPM adalah indeks.
- Adegan 3D wajib punya jalan-mundur: WebGL mati atau gerak dikurangi tetap menampilkan tanda statis.
- Halaman muka ada di `src/app/page.tsx` + `src/components/beranda/` (markup statis, `hidupkan.ts`, `adeganBeranda.ts`
  dengan `@ts-nocheck`, `beranda.css`). Tokennya di `tokens.css` blok `:root:has(.beranda)`: selalu gelap, tidak ikut tema ruang tanya.
  `globals.css` hanya dimuat oleh `/tanya`; jangan dipindah kembali ke layout, gayanya akan menimpa halaman muka.
- Pertanyaan dari halaman muka dibawa ke `/tanya` lewat `sessionStorage` kunci `fuli_tanya_awal`, dikirim sekali di utas baru.
  Jangan diganti parameter URL: tautan tidak boleh bisa memicu kiriman ke model.
- CSP (`next.config.ts`) hanya mengizinkan sumber sendiri: three dari npm, huruf dari fontsource, tanpa CDN.

## Memasang

```bash
# dari sumber kerja, sesudah commit
git bundle create /tmp/fuli.bundle main   # kirim ke app, lalu sebagai app-public:
# git fetch --update-head-ok <bundle> main:main && git read-tree HEAD
git archive HEAD | ssh app 'sudo -u app-public env HOME=/home/app-public tar -x -C /opt/public/fuli'
ssh app 'sudo -u app-public env HOME=/home/app-public bash -c "cd /opt/public/fuli && npx next build && pm2 reload fuli"'
```

## Sebelum menyatakan selesai

`npx tsc --noEmit` dan `npx next build` lolos, lalu uji di Chromium sungguhan: jawaban mengalir, muat ulang memulihkan riwayat,
ponsel 390 px tanpa geser samping, WebGL mati. Untuk halaman muka juga: kirim dari `/` sampai ke `/tanya` (tepat satu POST stream).
Bila `ops` kehabisan memori, Chromium uji di sana tidak sempat memuat; jalankan uji di `app` (`/usr/bin/chromium`, Node 22) terhadap
salinan uji di port lokal. Agen dibuktikan dari selisih `agent.turn_context` di
`ops:/var/lib/private/hermes/<profil>/logs/agent.log`, bukan dari kode.

Bila jawaban berupa pesan gagal atau kosong, periksa dulu 402 kredit di `ssh app 'sudo journalctl -u 9router'` sebelum mencurigai Fuli.
