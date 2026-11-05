/** Pengolahan angka untuk tampilan: format Indonesia, sumbu grafik, ekspor tabel. */
import type { DataTabel, KonfigGrafik } from "./jenis";
import { applyTableRowOrdering } from "./tableRowOrdering";

const LOKAL = "id-ID";

/** Nilai kosong khas BPS (-, ..., x, NA) menjadi null supaya tampil sebagai celah, bukan nol. */
export function angka(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || /^(-|–|—|\.{2,}|x|na|n\/a)$/i.test(s)) return null;
  s = s.replace(/\s|%/g, "").replace(/^rp\.?/i, "");
  const koma = s.lastIndexOf(",");
  const titik = s.lastIndexOf(".");
  if (koma >= 0 && titik >= 0) {
    s = koma > titik ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (koma >= 0) {
    s = s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (s.split(".").length > 2) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatSel(v: unknown, kolom?: string): string {
  if (v == null) return "-";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "-";
    const tahun = kolom?.toLowerCase() === "tahun" || (Number.isInteger(v) && v >= 1900 && v <= 2100);
    return tahun ? String(v) : v.toLocaleString(LOKAL);
  }
  const s = String(v).trim();
  return s || "-";
}

export const LABEL_KODE_BPS: Record<string, string> = {
  r: "Angka revisi",
  "*": "Angka sementara",
  "**": "Angka sangat sementara",
  "***": "Angka sangat-sangat sementara",
  e: "Angka estimasi",
  p: "Angka proyeksi",
  a: "Angka agregat",
  x: "Data tidak tersedia",
  "–": "Data nihil atau tidak ada",
  "-": "Data nihil atau tidak ada",
  "...": "Data belum tersedia",
  NA: "Tidak berlaku",
};

export function kodeSel(baris: Record<string, unknown>, kolom: string): { kode: string; arti: string } | null {
  const kode = (baris.value_codes as Record<string, string> | null | undefined)?.[kolom];
  if (!kode || !String(kode).trim()) return null;
  const k = String(kode).trim();
  return { kode: k, arti: LABEL_KODE_BPS[k] || `Catatan: ${k}` };
}

const padat = new Intl.NumberFormat(LOKAL, { notation: "compact", maximumFractionDigits: 1 });

function rupiah(n: number) {
  const a = Math.abs(n);
  const f = (x: number) => x.toLocaleString(LOKAL, { maximumFractionDigits: 1 });
  if (a >= 1e12) return `Rp ${f(n / 1e12)} T`;
  if (a >= 1e9) return `Rp ${f(n / 1e9)} M`;
  if (a >= 1e6) return `Rp ${f(n / 1e6)} Jt`;
  return `Rp ${n.toLocaleString(LOKAL, { maximumFractionDigits: 0 })}`;
}

export type FormatSumbu = KonfigGrafik["y_axis"]["format"];

export function formatSumbu(n: number, f: FormatSumbu): string {
  if (f === "currency") return rupiah(n);
  if (f === "percentage") return `${n.toLocaleString(LOKAL, { maximumFractionDigits: 1 })}%`;
  return Math.abs(n) >= 10000 ? padat.format(n) : n.toLocaleString(LOKAL, { maximumFractionDigits: 2 });
}

export function formatNilai(n: number | null, f: FormatSumbu): string {
  if (n == null) return "tidak ada data";
  if (f === "currency") return rupiah(n);
  const teks = n.toLocaleString(LOKAL, { maximumFractionDigits: 2 });
  return f === "percentage" ? `${teks}%` : teks;
}

/** Garis bantu pada angka bulat: 1, 2, 2,5, atau 5 kali pangkat sepuluh. */
export function tickRapi(min: number, max: number, jumlah = 5): number[] {
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    min -= d;
    max += d;
  }
  const kasar = (max - min) / Math.max(1, jumlah - 1);
  const pangkat = 10 ** Math.floor(Math.log10(kasar));
  const r = kasar / pangkat;
  const langkah = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * pangkat;
  const awal = Math.floor(min / langkah) * langkah;
  const akhir = Math.ceil(max / langkah) * langkah;
  const hasil: number[] = [];
  for (let v = awal; v <= akhir + langkah * 0.001; v += langkah) hasil.push(Number(v.toFixed(10)));
  return hasil;
}

export type DataGrafik = {
  label: string[];
  seri: Array<{ label: string; nilai: Array<number | null> }>;
  seriTerpotong: number;
};

const BATAS_SERI = 6;

export function siapkanGrafik(k: KonfigGrafik, baris: Array<Record<string, unknown>>, judul: string): DataGrafik {
  const x = k.x_axis?.column;
  let urut = baris;
  if (k.x_axis?.type !== "datetime") {
    // Urutan kabupaten/kota mengikuti kode wilayah, bukan urutan kemunculan.
    urut = applyTableRowOrdering({ rows: baris, columns: [x, ...k.series.map((s) => s.column)], title: judul }) as typeof baris;
  }
  const semuaTahun = urut.length > 1 && urut.every((r) => /^\d{4}$/.test(String(r[x] ?? "").trim()));
  if (semuaTahun) urut = [...urut].sort((a, b) => Number(a[x]) - Number(b[x]));
  const seri = k.series.slice(0, BATAS_SERI).map((s) => ({
    label: s.label || s.column,
    nilai: urut.map((r) => angka(r[s.column])),
  }));
  return {
    label: urut.map((r) => String(r[x] ?? "")),
    seri,
    seriTerpotong: Math.max(0, k.series.length - BATAS_SERI),
  };
}

export function urutkanBaris(t: DataTabel, baris: Array<Record<string, unknown>>, kolom: string[]) {
  try {
    return applyTableRowOrdering({ rows: baris, columns: kolom, title: t.title || "" }) as Array<Record<string, unknown>>;
  } catch {
    return baris;
  }
}

export function kolomAngka(kolom: string, baris: Array<Record<string, unknown>>) {
  if (/^tahun$/i.test(kolom)) return false;
  const contoh = baris.slice(0, 12).map((r) => r[kolom]).filter((v) => v != null && String(v).trim() !== "");
  return contoh.length > 0 && contoh.every((v) => angka(v) != null);
}

export function keCsv(kolom: string[], baris: Array<Record<string, unknown>>) {
  const sel = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [kolom.map(sel).join(","), ...baris.map((r) => kolom.map((c) => sel(r[c])).join(","))].join("\n");
}

export function keTsv(kolom: string[], baris: Array<Record<string, unknown>>) {
  const sel = (v: unknown) => (v == null ? "" : String(v).replace(/[\t\n]/g, " "));
  return [kolom.join("\t"), ...baris.map((r) => kolom.map((c) => sel(r[c])).join("\t"))].join("\n");
}

const BASIS_PORTAL = "https://malika.bpsmalut.com";

/** Hanya http, https, dan mailto yang boleh jadi tautan. Tautan relatif mengarah ke portal data. */
export function tautanAman(href?: string | null): string | null {
  const s = String(href || "").trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return BASIS_PORTAL + s;
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : null;
}

export function namaBerkas(judul: string | undefined) {
  const dasar = (judul || "data-fuli").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${dasar || "data-fuli"}.csv`;
}

export function detik(ms?: number) {
  if (ms == null) return "";
  return `${(ms / 1000).toLocaleString(LOKAL, { maximumFractionDigits: 1 })} detik`;
}

export function waktuRingkas(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const hari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const selisih = Math.round((hari(new Date()) - hari(t)) / 86400000);
  if (selisih === 0) return "Hari ini";
  if (selisih === 1) return "Kemarin";
  return t.toLocaleDateString(LOKAL, { day: "numeric", month: "short" });
}
