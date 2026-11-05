/**
 * Kurir: identitas anonim, panggilan API, dan pembaca aliran SSE.
 * Nama peristiwa dan header mengikuti backend PDS: `malika_ui`, `x-malika-uid`, `x-malika-token`.
 */
import type { BarisPesanBackend, MetaUi, Pesan, Utas } from "./jenis";

const KUNCI_UID = "fuli_uid";
const KUNCI_TOKEN = "fuli_token";
const PERBARUI_SEBELUM_DETIK = 30 * 24 * 60 * 60;

export type Identitas = { uid: string; token: string | null };

function acakUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function baca(kunci: string) {
  try {
    return localStorage.getItem(kunci);
  } catch {
    return null;
  }
}

function simpan(kunci: string, nilai: string) {
  try {
    localStorage.setItem(kunci, nilai);
  } catch {
    /* peramban menolak penyimpanan: identitas berlaku selama sesi ini */
  }
}

function kedaluwarsa(token: string): number | null {
  try {
    const bagian = token.split(".")[1];
    const isi = JSON.parse(atob(bagian.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof isi.exp === "number" ? isi.exp : null;
  } catch {
    return null;
  }
}

export async function siapkanIdentitas(): Promise<Identitas> {
  let uid = baca(KUNCI_UID);
  if (!uid) {
    uid = acakUid();
    simpan(KUNCI_UID, uid);
  }
  const lama = baca(KUNCI_TOKEN);
  if (lama) {
    const exp = kedaluwarsa(lama);
    if (exp && exp - Date.now() / 1000 > PERBARUI_SEBELUM_DETIK) return { uid, token: lama };
  }
  try {
    const r = await fetch("/api/chat/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(lama ? { "x-malika-token": lama } : {}) },
      body: JSON.stringify({ uid }),
    });
    if (r.ok) {
      const j = await r.json();
      if (j?.token) {
        simpan(KUNCI_TOKEN, j.token);
        if (j.uid) {
          simpan(KUNCI_UID, j.uid);
          uid = j.uid as string;
        }
        return { uid, token: j.token as string };
      }
    }
  } catch {
    /* lanjut dengan token lama bila ada */
  }
  return { uid, token: lama };
}

const kepala = (id: Identitas) => ({
  "x-malika-uid": id.uid,
  ...(id.token ? { "x-malika-token": id.token } : {}),
});

async function jsonAtauGalat(r: Response) {
  const j = await r.json().catch(() => null);
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `http_${r.status}`);
  return j;
}

export async function ambilUtas(id: Identitas): Promise<Utas[]> {
  const j = await jsonAtauGalat(await fetch("/api/chat/threads", { headers: kepala(id), cache: "no-store" }));
  return (j.threads || []) as Utas[];
}

export async function buatUtas(id: Identitas): Promise<Utas> {
  const j = await jsonAtauGalat(
    await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...kepala(id) },
      body: JSON.stringify({ title: "Chat baru" }),
    }),
  );
  return j.thread as Utas;
}

export async function hapusUtas(id: Identitas, utasId: number) {
  await jsonAtauGalat(await fetch(`/api/chat/threads/${utasId}`, { method: "DELETE", headers: kepala(id) }));
}

export async function ambilPesan(id: Identitas, utasId: number, sinyal?: AbortSignal): Promise<BarisPesanBackend[]> {
  const j = await jsonAtauGalat(
    await fetch(`/api/chat/threads/${utasId}/messages`, { headers: kepala(id), cache: "no-store", signal: sinyal }),
  );
  return (j.messages || []) as BarisPesanBackend[];
}

export async function ambilSaran(id: Identitas, utasId: number): Promise<string[]> {
  const r = await fetch(`/api/chat/threads/${utasId}/suggestions`, { headers: kepala(id), cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  return Array.isArray(j?.suggestions) ? (j.suggestions as string[]) : [];
}

export async function laporkan(id: Identitas, isi: { message_id: string; thread_id: number | null; flag_type: string }) {
  await jsonAtauGalat(
    await fetch("/api/error-learning/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...kepala(id) },
      body: JSON.stringify(isi),
    }),
  );
}

export async function kirimNilai(id: Identitas, isi: { thread_id: number; stars: number; review: string | null; thread_title: string }) {
  const r = await fetch("/api/chat-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...kepala(id) },
    body: JSON.stringify(isi),
  });
  if (!r.ok) throw new Error(`http_${r.status}`);
}

export async function ambilDokumen(id: Identitas, dokId: number) {
  const r = await fetch(`/api/search/knowledge/${dokId}`, { headers: kepala(id), cache: "no-store" });
  if (!r.ok) throw new Error(`http_${r.status}`);
  return (await r.json()) as {
    title?: string;
    abstract?: string;
    summary?: string;
    pdf_url?: string;
    source_url?: string;
    doc_type?: string;
    release_date?: string;
  };
}

export type PenerimaAliran = {
  padaTahap?: (d: { message: string; stage: string }) => void;
  padaRincian?: (d: { stage: string; detail: string; elapsedMs?: number }) => void;
  padaNalar?: (d: { content: string }) => void;
  padaTeks?: (d: { content: string }) => void;
  padaUi?: (d: MetaUi) => void;
  padaJudul?: (d: { title: string }) => void;
  padaSelesai?: (d: { full_text?: string }) => void;
  padaGalat?: (d: { message: string }) => void;
  /** Aliran tertutup, dengan atau tanpa peristiwa `done`. */
  padaTutup?: () => void;
};

function urai(potongan: string, p: PenerimaAliran) {
  let jenis = "text";
  let data = "";
  for (const baris of potongan.split("\n")) {
    if (baris.startsWith("event: ")) jenis = baris.slice(7).trim();
    else if (baris.startsWith("data: ")) data += baris.slice(6);
  }
  if (!data) return;
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(data);
  } catch {
    return;
  }
  switch (jenis) {
    case "status":
      p.padaTahap?.(d as { message: string; stage: string });
      break;
    case "status_detail":
      p.padaRincian?.(d as { stage: string; detail: string; elapsedMs?: number });
      break;
    case "reasoning":
      p.padaNalar?.(d as { content: string });
      break;
    case "text":
      p.padaTeks?.(d as { content: string });
      break;
    case "chunk":
      p.padaTeks?.({ content: String(d.text || "") });
      break;
    case "malika_ui":
      if (d.v === 1) p.padaUi?.(d as unknown as MetaUi);
      break;
    case "thread_updated":
      p.padaJudul?.(d as { title: string });
      break;
    case "done":
      p.padaSelesai?.(d as { full_text?: string });
      break;
    case "error":
      p.padaGalat?.(d as { message: string });
      break;
  }
}

/** Mengirim pesan dan membaca aliran. Galat jaringan dicoba ulang dua kali, galat server tidak. */
export function alirkanPesan(id: Identitas, utasId: number, teks: string, p: PenerimaAliran): AbortController {
  const henti = new AbortController();
  const coba = async (ke: number): Promise<void> => {
    try {
      const r = await fetch(`/api/chat/threads/${utasId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...kepala(id) },
        body: JSON.stringify({ text: teks }),
        signal: henti.signal,
      });
      if (!r.ok || !r.body) {
        p.padaGalat?.({ message: `http_${r.status}` });
        return;
      }
      const pembaca = r.body.getReader();
      const pengurai = new TextDecoder();
      let sisa = "";
      for (;;) {
        const { done, value } = await pembaca.read();
        if (done) break;
        sisa += pengurai.decode(value, { stream: true });
        const bagian = sisa.split("\n\n");
        sisa = bagian.pop() || "";
        for (const b of bagian) if (b.trim()) urai(b, p);
      }
      if (sisa.trim()) urai(sisa, p);
      p.padaTutup?.();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (ke < 2) {
        await new Promise((s) => setTimeout(s, 1500 * 2 ** ke));
        if (!henti.signal.aborted) return coba(ke + 1);
        return;
      }
      p.padaGalat?.({ message: "network" });
    }
  };
  void coba(0);
  return henti;
}

/** Memisahkan teks jawaban dari blok data yang disimpan backend di akhir pesan. */
export function pisahkanBlokUi(isi: string): { teks: string; ui: MetaUi | null } {
  const mentah = String(isi || "");
  const blok = mentah.match(/```\s*malika_ui\s*([\s\S]*?)```/i);
  if (blok) {
    const teks = mentah.replace(blok[0], "").replace(/\n{3,}/g, "\n\n").trim();
    try {
      const ui = JSON.parse(String(blok[1]).trim());
      if (ui?.v === 1) return { teks, ui };
    } catch {
      return { teks, ui: null };
    }
  }
  const tanda = mentah.indexOf("<!--MALIKA_UI:");
  if (tanda === -1) return { teks: mentah.trim(), ui: null };
  const akhir = mentah.indexOf("-->", tanda);
  if (akhir === -1) return { teks: mentah.trim(), ui: null };
  const teks = [mentah.slice(0, tanda), mentah.slice(akhir + 3)].map((s) => s.trim()).filter(Boolean).join("\n\n");
  try {
    return { teks, ui: JSON.parse(mentah.slice(tanda + 14, akhir).trim()) };
  } catch {
    return { teks: mentah.trim(), ui: null };
  }
}

/**
 * Baris "Sumber:" dan nomor WhatsApp dibuang dari teks karena sudah tampil rapi di bawah data.
 * Pola disalin dari cleanAssistantBubbleText di frontend lama.
 */
export function rapikanTeks(teks: string): string {
  if (!teks) return teks;
  return teks
    .replace(/^[\s]*(?:\*{0,2}|\()?Sumber\s*:\s*.+?(?:\*{0,2}|\))?$/gim, "")
    .replace(/\[Sumber:\s*[^\]]+\]/gi, "")
    .replace(/(?:untuk\s+(?:konfirmasi|informasi|bantuan)[^.]*?)?(?:silakan\s+)?hubungi\s+BPS\s+Maluku\s+Utara\s+via\s+WhatsApp[^.\n]*[.\n]?/gi, "")
    .replace(/^[\s]*\[?\+?62[\s-]?851[\s-]?7676[\s-]?4422\]?\s*(?:\(https?:\/\/wa\.me\/[^)]+\))?\s*$/gim, "")
    .replace(/\[?\+?62[\s-]?851[\s-]?7676[\s-]?4422\]?\s*\(https?:\/\/wa\.me\/[^)]+\)/g, "")
    .replace(/WhatsApp\s+di\s*\.?\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(/(?:silakan|via)\s*\.?\s*$/im, "")
    .trim();
}

/** Mengubah baris backend menjadi pesan tampilan. */
export function barisKePesan(baris: BarisPesanBackend[]): Pesan[] {
  const hasil: Pesan[] = [];
  for (const b of baris) {
    if (b.role !== "user" && b.role !== "assistant") continue;
    const dibuat = new Date(b.created_at).getTime() || Date.now();
    if (b.role === "user") {
      hasil.push({ id: `b${b.id}`, peran: "user", teks: b.content, keadaan: "selesai", tahap: [], nalar: "", dibuat, idBackend: b.id });
      continue;
    }
    const { teks, ui } = pisahkanBlokUi(b.content);
    const langkah = (ui?.thinkingItems || []).filter((l) => l.step !== "reasoning" && (l.label || l.step));
    const nalar = (ui?.thinkingItems || []).find((l) => l.step === "reasoning");
    hasil.push({
      id: `b${b.id}`,
      peran: "assistant",
      teks: rapikanTeks(teks),
      ui,
      keadaan: "selesai",
      tahap: langkah.map((l) => ({ tahap: String(l.step || l.label), label: String(l.label || l.step), detail: l.detail, ms: l.elapsedMs, selesai: true })),
      nalar: String(nalar?.content || nalar?.text || ""),
      dibuat,
      idBackend: b.id,
    });
  }
  return hasil;
}
