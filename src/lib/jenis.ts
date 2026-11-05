/** Bentuk data chat. Mengikuti kontrak blok `malika_ui` dari backend PDS (nama blok tidak diubah). */
export type Utas = {
  id: number;
  title: string;
  last_message_at: string | null;
  created_at: string;
};

export type BarisPesanBackend = {
  id: number;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
};

export type DataTabel = {
  kind?: "data" | "search";
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  total_rows?: number;
  eximMode?: "ekspor" | "impor" | null;
  bps_web_url?: string | null;
  source_id?: number | null;
  allRows?: Array<Record<string, unknown>> | null;
  allColumns?: string[] | null;
  availableYears?: string[] | null;
  defaultYear?: string | null;
};

export type KonfigGrafik = {
  should_render: boolean;
  chart_type: "line" | "bar" | "pie" | "area" | "stacked-bar" | "grouped-bar";
  x_axis: { column: string; label: string; type: "category" | "datetime" | "numeric" };
  series: Array<{ column: string; label: string; type?: "primary" | "secondary" }>;
  y_axis: { label: string; format: "number" | "percentage" | "currency" | "index" };
  options?: { stacked?: boolean; show_legend?: boolean; orientation?: "horizontal" | "vertical" };
  chart_title?: string;
  chart_subtitle?: string | null;
};

export type ButirDefinisi = {
  type: string;
  nama: string;
  definisi: string | null;
  konsep: string | null;
  satuan: string | null;
  metode: string | null;
  frekuensi: string | null;
};

export type LangkahBerpikir = {
  step?: string;
  label?: string;
  detail?: string;
  elapsedMs?: number;
  content?: string;
  text?: string;
};

export type MetaUi = {
  v: 1;
  query?: string;
  table?: DataTabel;
  table2?: DataTabel;
  candidates?: Array<{ id: number; name: string; type: string; latest?: string | null }>;
  knowledgeCandidates?: Array<{ id: number; name: string; type: string; category?: string }> | null;
  sources?: Array<{ type: string; id: number; title: string; category?: string }> | null;
  externalLinks?: Array<{ title: string; url: string; domain: string; snippet?: string; trustBadge?: string }> | null;
  suggestions?: string[];
  recommendations?: Array<{ queryHint?: string }> | null;
  confidence?: { level: "high" | "medium" | "low" } | null;
  chart?: KonfigGrafik | null;
  dnaMetadata?: { items: ButirDefinisi[] } | null;
  thinkingItems?: LangkahBerpikir[] | null;
};

export type Tahap = { tahap: string; label: string; detail?: string; ms?: number; selesai: boolean };

export type Pesan = {
  id: string;
  peran: "user" | "assistant";
  teks: string;
  ui?: MetaUi | null;
  keadaan: "selesai" | "mengalir" | "gagal" | "dihentikan";
  tahap: Tahap[];
  nalar: string;
  durasiMs?: number;
  dibuat: number;
  idBackend?: number;
};
