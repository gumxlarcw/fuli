/** Ikon garis 20 piksel. Hanya yang dipakai, tanpa pustaka ikon. */
const JALUR: Record<string, string> = {
  riwayat: "M4 6h12M4 10h12M4 14h7",
  tambah: "M10 4v12M4 10h12",
  matahari: "M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM10 2.5v1.6M10 15.9v1.6M2.5 10h1.6M15.9 10h1.6M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M4.7 15.3l1.1-1.1M14.2 5.8l1.1-1.1",
  bulan: "M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z",
  kirim: "M10 16V4.5M5 9.5l5-5 5 5",
  henti: "M6 6h8v8H6z",
  salin: "M7.5 7.5h8v8h-8zM4.5 12.5v-8h8",
  suka: "M6.5 9l3-5.5c1.2 0 2 .9 2 2V8h4c.8 0 1.4.8 1.2 1.6l-1.3 5.2c-.2.7-.7 1.2-1.5 1.2H6.5M6.5 9v7M6.5 9H4v7h2.5",
  tidaksuka: "M13.5 11l-3 5.5c-1.2 0-2-.9-2-2V12h-4c-.8 0-1.4-.8-1.2-1.6l1.3-5.2C4.8 4.5 5.3 4 6.1 4h7.4M13.5 11V4M13.5 11H16V4h-2.5",
  bendera: "M5 17.5V3.5M5 4.5c3.5-1.5 6.5 1.5 10 0v7c-3.5 1.5-6.5-1.5-10 0",
  tutup: "M5 5l10 10M15 5L5 15",
  unduh: "M10 3.5v9M6 9l4 4 4-4M4 16.5h12",
  keluar: "M8 4H4.5v11.5H16V12M11 4h5v5M16 4l-7 7",
  hapus: "M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6",
  bawah: "M10 4v12M5 11l5 5 5-5",
  segar: "M16 10a6 6 0 1 1-1.8-4.3M16 3v3.5h-3.5",
  dokumen: "M6 3h6l3 3v11H6zM12 3v3h3M8 10h5M8 13h5",
  centang: "M4.5 10.5l3.5 3.5 7.5-8",
};

export function Ikon({ nama, ukuran = 20 }: { nama: keyof typeof JALUR | string; ukuran?: number }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={JALUR[nama]} />
    </svg>
  );
}
