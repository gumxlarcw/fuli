"use client";

/**
 * Satu halaman, satu pekerjaan: bertanya. Layar pembuka berubah menjadi percakapan
 * tanpa pindah halaman; biji 3D mengikuti elemen `.jangkar` yang digerakkan CSS.
 */
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Pesan, Tahap, Utas } from "@/lib/jenis";
import type { Identitas } from "@/lib/kurir";
import { alirkanPesan, ambilPesan, ambilSaran, ambilUtas, barisKePesan, buatUtas, hapusUtas, kirimNilai, siapkanIdentitas } from "@/lib/kurir";
import { waktuRingkas } from "@/lib/olah";
import type { AdeganFuli, TemaAdegan } from "./adegan/fuliScene";
import { TAUTAN_WA } from "./BlokData";
import { Ikon } from "./Ikon";
import { PesanFuli } from "./PesanFuli";

const CONTOH = [
  { judul: "Harga & inflasi", teks: "Inflasi Kota Ternate bulan ini", ikon: "grafik" },
  { judul: "Kesejahteraan", teks: "Tingkat kemiskinan per kabupaten/kota", ikon: "penduduk" },
  { judul: "Pembangunan manusia", teks: "IPM Maluku Utara 5 tahun terakhir", ikon: "buku" },
  { judul: "Ekonomi & perdagangan", teks: "Ekspor nikel Maluku Utara per bulan", ikon: "kompas" },
];

const URUT_TAHAP: Record<string, number> = {
  normalize: 1,
  dna: 2,
  search: 3,
  preview: 4,
  knowledge: 5,
  deepdive: 6,
  thinking: 6,
  generating: 7,
  format: 8,
};

const KUNCI_UTAS = "fuli_utas_aktif";
// Pertanyaan yang diketik di halaman muka (/), dibawa sekali lewat sessionStorage.
const KUNCI_TANYA_AWAL = "fuli_tanya_awal";
const KUNCI_TEMA = "fuli_tema";
const POLA_TERIMA_KASIH = /terima\s*kasih|makasih|matur\s*nuwun|thanks|thank\s*you|\bthx\b|\bty\b/i;

function pesanGalat(m: string) {
  if (m === "network") return "Sambungan ke Fuli terputus. Periksa jaringan, lalu kirim ulang.";
  if (/http_429|terlalu banyak|rate/i.test(m)) return "Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar, lalu kirim ulang.";
  if (/^http_/.test(m)) return "Fuli sedang tidak bisa menjawab. Kirim ulang beberapa saat lagi.";
  return m || "Fuli sedang tidak bisa menjawab. Kirim ulang beberapa saat lagi.";
}

function baca(kunci: string, wadah: "lokal" | "sesi" = "lokal") {
  try {
    return (wadah === "lokal" ? localStorage : sessionStorage).getItem(kunci);
  } catch {
    return null;
  }
}

function tulis(kunci: string, nilai: string | null, wadah: "lokal" | "sesi" = "lokal") {
  try {
    const s = wadah === "lokal" ? localStorage : sessionStorage;
    if (nilai == null) s.removeItem(kunci);
    else s.setItem(kunci, nilai);
  } catch {
    /* penyimpanan ditolak peramban: fitur ini cukup berlaku selama halaman terbuka */
  }
}

function Merek() {
  return (
    <span className="merek" aria-label="Fuli">
      <span aria-hidden="true">
        Ful<span className="merek-i">ı<i /></span>
      </span>
    </span>
  );
}

function TombolTema({ tema, ganti }: { tema: TemaAdegan; ganti: () => void }) {
  return (
    <button type="button" className="tombol-ikon" onClick={ganti} aria-label={tema === "dark" ? "Pakai tampilan terang" : "Pakai tampilan gelap"} title={tema === "dark" ? "Tampilan terang" : "Tampilan gelap"}>
      <Ikon nama={tema === "dark" ? "matahari" : "bulan"} />
    </button>
  );
}

function Pengetik({ kirim, henti, mengalir, fokusAwal, tanda, siap = true }: { kirim: (t: string) => void; henti: () => void; mengalir: boolean; fokusAwal?: boolean; tanda: string; siap?: boolean }) {
  const [teks, setTeks] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [teks]);

  useEffect(() => {
    if (fokusAwal && window.matchMedia("(min-width: 900px)").matches) area.current?.focus();
  }, [fokusAwal]);

  const lepas = () => {
    const t = teks.trim();
    if (!t || mengalir || !siap) return;
    kirim(t);
    setTeks("");
  };

  const tombol = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      lepas();
    }
  };

  return (
    <form
      className="pengetik"
      onSubmit={(e) => {
        e.preventDefault();
        lepas();
      }}
    >
      <textarea ref={area} rows={1} value={teks} onChange={(e) => setTeks(e.target.value)} onKeyDown={tombol} placeholder={tanda} aria-label="Tulis pertanyaan" maxLength={4000} />
      <div className="pengetik-kaki">
        <span><Ikon nama="dokumen" ukuran={16} /> Data BPS Maluku Utara</span>
        <div className="pengetik-kirim"><kbd>Enter</kbd>
      {mengalir ? (
        <button type="button" className="tombol-biji" data-henti="true" onClick={henti} aria-label="Hentikan jawaban" title="Hentikan jawaban">
          <Ikon nama="henti" />
        </button>
      ) : (
        <button type="submit" className="tombol-biji" disabled={!teks.trim() || !siap} aria-label="Kirim pertanyaan" title="Kirim pertanyaan">
          <Ikon nama="kirim" />
        </button>
      )}
        </div>
      </div>
    </form>
  );
}

function DaftarUtas({ utas, aktif, pilih, hapus }: { utas: Utas[]; aktif: number | null; pilih: (u: Utas) => void; hapus: (u: Utas) => void }) {
  const [yakin, setYakin] = useState<number | null>(null);
  if (utas.length === 0) return <p className="utas-kosong">Percakapan yang sudah dimulai akan tersimpan di sini.</p>;
  return (
    <ul className="daftar-utas">
      <AnimatePresence initial={false}>
        {utas.map((u) => (
          <motion.li key={u.id} layout="position" exit={{ opacity: 0, height: 0 }} data-aktif={u.id === aktif}>
            <button type="button" className="utas-buka" onClick={() => pilih(u)} aria-current={u.id === aktif}>
              <span>{u.title || "Percakapan"}</span>
              <small>{waktuRingkas(u.last_message_at || u.created_at)}</small>
            </button>
            {yakin === u.id ? (
              <button type="button" className="utas-yakin" onClick={() => hapus(u)} onBlur={() => setYakin(null)} autoFocus>
                Hapus
              </button>
            ) : (
              <button type="button" className="tombol-ikon kecil utas-hapus" onClick={() => setYakin(u.id)} aria-label={`Hapus percakapan ${u.title || ""}`} title="Hapus percakapan">
                <Ikon nama="hapus" ukuran={17} />
              </button>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function NilaiPercakapan({ kirim }: { kirim: (b: number) => Promise<void> }) {
  const [nilai, setNilai] = useState(0);
  const [atas, setAtas] = useState(0);
  const [selesai, setSelesai] = useState(false);
  if (selesai) return <p className="nilai-terima" role="status">Penilaian tersimpan. Terima kasih.</p>;
  return (
    <motion.div className="nilai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <span id="nilai-judul">Seberapa membantu percakapan ini?</span>
      <div role="group" aria-labelledby="nilai-judul" onPointerLeave={() => setAtas(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            data-nyala={n <= (atas || nilai)}
            aria-label={`${n} dari 5`}
            onPointerEnter={() => setAtas(n)}
            onClick={async () => {
              setNilai(n);
              try {
                await kirim(n);
                setSelesai(true);
              } catch {
                setNilai(0);
              }
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function FuliApp() {
  const [id, setId] = useState<Identitas | null>(null);
  const [utas, setUtas] = useState<Utas[]>([]);
  const [utasAktif, setUtasAktif] = useState<number | null>(null);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [mengalir, setMengalir] = useState(false);
  const [saran, setSaran] = useState<string[]>([]);
  const [laci, setLaci] = useState(false);
  const [tema, setTema] = useState<TemaAdegan>("light");
  const [webglGagal, setWebglGagal] = useState(false);
  const [adeganSiap, setAdeganSiap] = useState(false);
  const [gerakDikurangi, setGerakDikurangi] = useState(true);
  const [diBawah, setDiBawah] = useState(true);
  const [tahapAktif, setTahapAktif] = useState<string>("");
  const [dinilai, setDinilai] = useState(false);
  const [idBaru, setIdBaru] = useState<Set<string>>(() => new Set());

  const tombolRiwayat = useRef<HTMLButtonElement>(null);
  const dialogRiwayat = useRef<HTMLElement>(null);
  const bingkai = useRef<HTMLDivElement>(null);
  const kanvas = useRef<HTMLCanvasElement>(null);
  const jangkar = useRef<HTMLDivElement>(null);
  const adegan = useRef<AdeganFuli | null>(null);
  const gulir = useRef<HTMLDivElement>(null);
  const henti = useRef<AbortController | null>(null);
  const tungguSaran = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lekat = useRef(true);
  const tahapUrut = useRef(0);
  const utasRef = useRef<number | null>(null);
  const tanyaAwal = useRef<string | null>(null);
  utasRef.current = utasAktif;

  const modus = pesan.length === 0 && !memuat ? "hero" : "chat";

  useEffect(() => {
    const dipaksa = document.documentElement.getAttribute("data-theme");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const terapkan = () => setTema((document.documentElement.getAttribute("data-theme") as TemaAdegan) || (media.matches ? "dark" : "light"));
    if (dipaksa === "dark" || dipaksa === "light") setTema(dipaksa);
    else setTema(media.matches ? "dark" : "light");
    media.addEventListener("change", terapkan);
    return () => media.removeEventListener("change", terapkan);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ubah = () => setGerakDikurangi(media.matches);
    ubah();
    media.addEventListener("change", ubah);
    return () => media.removeEventListener("change", ubah);
  }, []);

  useEffect(() => {
    if (!laci) return;
    const sebelumnya = tombolRiwayat.current;
    const tombol = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setLaci(false);
      if (e.key !== "Tab") return;
      const daftar = Array.from(dialogRiwayat.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') || []);
      const awal = daftar[0];
      const akhir = daftar[daftar.length - 1];
      if (e.shiftKey && document.activeElement === awal) { e.preventDefault(); akhir?.focus(); }
      if (!e.shiftKey && document.activeElement === akhir) { e.preventDefault(); awal?.focus(); }
    };
    document.addEventListener("keydown", tombol);
    return () => { document.removeEventListener("keydown", tombol); sebelumnya?.focus(); };
  }, [laci]);

  useEffect(() => {
    setAdeganSiap(false);
    setWebglGagal(false);
    if (gerakDikurangi || !kanvas.current || !jangkar.current) return;
    let batal = false;
    let dibuat: AdeganFuli | null = null;
    const kurangi = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const awalTema = (document.documentElement.getAttribute("data-theme") as TemaAdegan) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    import("./adegan/fuliScene")
      .then(({ buatAdeganFuli }) => {
        if (batal || !kanvas.current || !jangkar.current) return;
        dibuat = buatAdeganFuli({
          kanvas: kanvas.current,
          jangkar: jangkar.current,
          gerakDikurangi: kurangi,
          tema: (document.documentElement.getAttribute("data-theme") as TemaAdegan) || awalTema,
          modus: jangkar.current.closest(".aplikasi")?.getAttribute("data-modus") === "chat" ? "chat" : "hero",
          padaSiap: () => setAdeganSiap(true),
          padaGagal: () => setWebglGagal(true),
        });
        adegan.current = dibuat;
      })
      .catch(() => setWebglGagal(true));
    return () => {
      batal = true;
      dibuat?.bersihkan();
      adegan.current = null;
    };
  }, [gerakDikurangi]);

  useEffect(() => {
    adegan.current?.aturModus(modus);
  }, [modus, adeganSiap]);
  useEffect(() => { bingkai.current?.style.setProperty("--gulir-pembuka", "0px"); }, [modus]);
  useEffect(() => adegan.current?.aturTema(tema), [tema, adeganSiap]);
  useEffect(() => {
    adegan.current?.aturKerja(mengalir);
    adegan.current?.aturTahap(tahapUrut.current);
    if (!mengalir) {
      tahapUrut.current = 0;
      adegan.current?.aturTahap(0);
      setTahapAktif("");
    }
  }, [mengalir, adeganSiap]);

  const muatUlangUtas = useCallback(async (i: Identitas) => {
    try {
      setUtas(await ambilUtas(i));
    } catch {
      /* daftar tetap yang lama; percakapan tidak terganggu */
    }
  }, []);

  const hentikanSaran = () => {
    tungguSaran.current.forEach(clearTimeout);
    tungguSaran.current = [];
  };

  const muatSaran = useCallback((i: Identitas, u: number) => {
    hentikanSaran();
    for (const tunda of [0, 3000, 8000, 15000]) {
      tungguSaran.current.push(
        setTimeout(async () => {
          if (utasRef.current !== u) return;
          const s = await ambilSaran(i, u).catch(() => []);
          if (s.length && utasRef.current === u) {
            setSaran(s.slice(0, 4));
            hentikanSaran();
          }
        }, tunda),
      );
    }
  }, []);

  const bukaUtas = useCallback(
    async (i: Identitas, u: number) => {
      henti.current?.abort();
      hentikanSaran();
      setMengalir(false);
      setUtasAktif(u);
      setMemuat(true);
      setSaran([]);
      setDinilai(baca(`fuli_nilai_${u}`) === "1");
      setLaci(false);
      tulis(KUNCI_UTAS, String(u), "sesi");
      try {
        const baris = await ambilPesan(i, u);
        setPesan(barisKePesan(baris));
        lekat.current = true;
        muatSaran(i, u);
      } catch {
        setUtasAktif(null);
        setPesan([]);
        tulis(KUNCI_UTAS, null, "sesi");
      } finally {
        setMemuat(false);
      }
    },
    [muatSaran],
  );

  useEffect(() => {
    let hidup = true;
    siapkanIdentitas().then((i) => {
      if (!hidup) return;
      const awal = baca(KUNCI_TANYA_AWAL, "sesi")?.trim().slice(0, 1000) || null;
      tulis(KUNCI_TANYA_AWAL, null, "sesi");
      tanyaAwal.current = awal;
      setId(i);
      void muatUlangUtas(i);
      const tersimpan = Number(baca(KUNCI_UTAS, "sesi"));
      // Pertanyaan dari halaman muka membuka utas baru, bukan menyambung utas terakhir.
      if (awal) tulis(KUNCI_UTAS, null, "sesi");
      else if (tersimpan > 0) void bukaUtas(i, tersimpan);
    });
    return () => {
      hidup = false;
    };
  }, [bukaUtas, muatUlangUtas]);

  useLayoutEffect(() => {
    const el = gulir.current;
    if (el && lekat.current) el.scrollTop = el.scrollHeight;
  }, [pesan, saran]);

  const padaGulir = () => {
    const el = gulir.current;
    if (!el) return;
    const dekat = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    lekat.current = dekat;
    setDiBawah(dekat);
  };

  const keBawah = () => {
    const el = gulir.current;
    if (!el) return;
    lekat.current = true;
    setDiBawah(true);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const kirim = useCallback(
    async (teks: string, sudahAda?: { idTanya: string; idJawab: string }) => {
      if (!id || mengalir) return;
      const t0 = performance.now();
      const idTanya = sudahAda?.idTanya || `u${Date.now()}`;
      const idJawab = sudahAda?.idJawab || `a${Date.now()}`;
      const jawabAwal: Pesan = { id: idJawab, peran: "assistant", teks: "", keadaan: "mengalir", tahap: [], nalar: "", dibuat: Date.now() };

      hentikanSaran();
      setSaran([]);
      setIdBaru((s) => new Set(s).add(idTanya).add(idJawab));
      lekat.current = true;
      setDiBawah(true);
      setMengalir(true);
      adegan.current?.sentak();
      setPesan((p) =>
        sudahAda
          ? p.map((m) => (m.id === idJawab ? jawabAwal : m))
          : [...p, { id: idTanya, peran: "user", teks, keadaan: "selesai", tahap: [], nalar: "", dibuat: Date.now() }, jawabAwal],
      );

      const ubah = (f: (m: Pesan) => Pesan) => setPesan((p) => p.map((m) => (m.id === idJawab ? f(m) : m)));
      const gagal = (m: string) => {
        ubah((x) => ({ ...x, keadaan: "gagal", nalar: pesanGalat(m), tahap: [] }));
        setMengalir(false);
      };

      let u = utasRef.current;
      if (!u) {
        try {
          const baru = await buatUtas(id);
          u = baru.id;
          setUtasAktif(u);
          utasRef.current = u;
          setUtas((d) => [baru, ...d]);
          tulis(KUNCI_UTAS, String(u), "sesi");
          setDinilai(false);
        } catch {
          gagal("network");
          return;
        }
      }
      const utasIni = u;
      let akhirTerpanggil = false;

      const selesai = (penuh?: string) => {
        if (akhirTerpanggil) return;
        akhirTerpanggil = true;
        const durasi = performance.now() - t0;
        ubah((x) => {
          const teksAkhir = x.teks || penuh || "";
          if (!teksAkhir && !x.ui) return { ...x, keadaan: "gagal", nalar: pesanGalat(""), tahap: [] };
          return { ...x, teks: teksAkhir, keadaan: "selesai", durasiMs: durasi, tahap: x.tahap.map((t) => ({ ...t, selesai: true })) };
        });
        setMengalir(false);
        void muatUlangUtas(id);
        muatSaran(id, utasIni);
        // Nomor pesan dari basis data dipakai untuk laporan masalah.
        for (const tunda of [900, 3500]) {
          setTimeout(async () => {
            const baris = await ambilPesan(id, utasIni).catch(() => []);
            const jawab = baris.filter((b) => b.role === "assistant");
            const terakhir = jawab[jawab.length - 1];
            if (terakhir) ubah((x) => ({ ...x, idBackend: x.idBackend ?? terakhir.id }));
          }, tunda);
        }
      };

      henti.current = alirkanPesan(id, utasIni, teks, {
        padaTahap: (asli) => {
          // Label backend ini istilah internal; pengguna membaca kata yang biasa.
          const d = { ...asli, message: asli.message?.replace("Analisis DNA data", "Mengenali bentuk data") };
          const urut = URUT_TAHAP[d.stage];
          if (urut) { tahapUrut.current = urut; adegan.current?.aturTahap(urut); }
          setTahapAktif(d.message || "");
          ubah((x) => {
            const kunci = d.stage || d.message;
            const ada = x.tahap.some((t) => t.tahap === kunci);
            const tahap: Tahap[] = x.tahap.map((t) => (t.tahap === kunci ? { ...t, label: d.message || t.label, selesai: false } : { ...t, selesai: true }));
            if (!ada) tahap.push({ tahap: kunci, label: d.message || d.stage, selesai: false });
            return { ...x, tahap };
          });
        },
        padaRincian: (d) => ubah((x) => ({ ...x, tahap: x.tahap.map((t) => (t.tahap === d.stage ? { ...t, detail: d.detail, ms: d.elapsedMs } : t)) })),
        padaNalar: (d) => ubah((x) => ({ ...x, nalar: x.nalar + (d.content || "") })),
        padaTeks: (d) => ubah((x) => ({ ...x, teks: x.teks + (d.content || "") })),
        padaUi: (d) => ubah((x) => ({ ...x, ui: d })),
        padaJudul: (d) => setUtas((daftar) => daftar.map((it) => (it.id === utasIni ? { ...it, title: d.title } : it))),
        padaSelesai: (d) => selesai(d.full_text),
        padaGalat: (d) => {
          akhirTerpanggil = true;
          gagal(d.message);
        },
        padaTutup: () => selesai(),
      });
    },
    [id, mengalir, muatSaran, muatUlangUtas],
  );

  // Kirim sekali pertanyaan bawaan halaman muka begitu identitas siap.
  useEffect(() => {
    if (!id || mengalir || !tanyaAwal.current) return;
    const t = tanyaAwal.current;
    tanyaAwal.current = null;
    void kirim(t);
  }, [id, mengalir, kirim]);

  const hentikan = () => {
    henti.current?.abort();
    setPesan((p) => p.map((m) => (m.keadaan === "mengalir" ? { ...m, keadaan: m.teks ? "selesai" : "dihentikan", tahap: m.tahap.map((t) => ({ ...t, selesai: true })) } : m)));
    setMengalir(false);
  };

  const baru = () => {
    henti.current?.abort();
    hentikanSaran();
    setMengalir(false);
    setUtasAktif(null);
    utasRef.current = null;
    setPesan([]);
    setSaran([]);
    setLaci(false);
    setDinilai(false);
    tulis(KUNCI_UTAS, null, "sesi");
  };

  const hapus = async (u: Utas) => {
    if (!id) return;
    try {
      await hapusUtas(id, u.id);
      setUtas((d) => d.filter((x) => x.id !== u.id));
      if (u.id === utasAktif) baru();
    } catch {
      void muatUlangUtas(id);
    }
  };

  const gantiTema = () => {
    const berikut: TemaAdegan = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", berikut);
    tulis(KUNCI_TEMA, berikut);
    setTema(berikut);
  };

  const pesanTerakhir = pesan[pesan.length - 1];
  const tanyaTerakhir = [...pesan].reverse().find((m) => m.peran === "user");
  const tawarkanNilai = !mengalir && !dinilai && utasAktif != null && pesanTerakhir?.peran === "assistant" && pesanTerakhir.keadaan === "selesai" && POLA_TERIMA_KASIH.test(tanyaTerakhir?.teks || "");

  const nilai = async (bintang: number) => {
    if (!id || !utasAktif) return;
    await kirimNilai(id, { thread_id: utasAktif, stars: bintang, review: null, thread_title: utas.find((u) => u.id === utasAktif)?.title || "Percakapan" });
    tulis(`fuli_nilai_${utasAktif}`, "1");
  };

  const ulangTerakhir = () => {
    const iJawab = pesan.length - 1;
    const jawab = pesan[iJawab];
    const tanya = pesan[iJawab - 1];
    if (!jawab || !tanya) return;
    void kirim(tanya.teks, { idTanya: tanya.id, idJawab: jawab.id });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={bingkai} className="aplikasi" data-modus={modus} data-kerja={mengalir} data-statis={gerakDikurangi || webglGagal}>
        <div className="panggung" aria-hidden="true">
          <span className="panggung-nama">fuli</span>
          <div className="panggung-atas"><span>Berakar di Maluku Utara</span><span className="panggung-tanda">✳</span></div>
          <div className="panggung-kaki"><span className="panggung-garis" /><p>Jala merah pala.<br />Asal nama Fuli.</p><span className="panggung-latin">Myristica fragrans</span></div>
        </div>
        <div className="rel-latar" aria-hidden="true" />
        <canvas ref={kanvas} className="kanvas" aria-hidden="true" />
        <div ref={jangkar} className="jangkar" aria-hidden="true">
          {(webglGagal || gerakDikurangi || !adeganSiap) && <img src={tema === "dark" ? "/fuli-tanda-gelap.svg" : "/fuli-tanda.svg"} alt="" />}
        </div>

        <header className="kepala">
          <button type="button" className="kepala-merek merek-ponsel" onClick={baru} aria-label="Fuli, percakapan baru"><Merek /></button>
          <div className="kepala-konteks"><span>Ruang tanya</span><span aria-hidden="true">/</span><strong>Maluku Utara</strong></div>
          <div className="kepala-aksi">
            <span className="label-sumber"><Ikon nama="dokumen" ukuran={16} /> Bersumber dari BPS</span>
            <button type="button" className="tombol-ikon aksi-ponsel" onClick={baru} aria-label="Percakapan baru" title="Percakapan baru"><Ikon nama="tambah" /></button>
            <button ref={tombolRiwayat} type="button" className="tombol-ikon" onClick={() => setLaci(true)} aria-label="Riwayat percakapan" title="Riwayat percakapan"><Ikon nama="riwayat" /></button>
            <TombolTema tema={tema} ganti={gantiTema} />
          </div>
        </header>

        <aside className="rel" aria-label="Percakapan">
          <div className="rel-atas">
            <button type="button" className="kepala-merek" onClick={baru} aria-label="Fuli, percakapan baru"><Merek /></button>
            <span className="rel-lokal">Maluku Utara</span>
          </div>
          <button type="button" className="tombol-baru" onClick={baru}><Ikon nama="tambah" ukuran={18} /> Percakapan baru</button>
          <div className="rel-pengantar"><Ikon nama="obrolan" ukuran={18} /><span>Ruang untuk rasa ingin tahu.</span></div>
          <div className="rel-biji" />
          {modus === "chat" && <p className="rel-tahap" aria-live="polite">{mengalir ? tahapAktif || "Membaca pertanyaan" : "Siap untuk pertanyaan berikutnya"}</p>}
          <div className="rel-riwayat-judul"><span>Percakapan Anda</span><span>{utas.length > 0 ? utas.length : ""}</span></div>
          <div className="rel-daftar"><DaftarUtas utas={utas} aktif={utasAktif} pilih={(u) => id && bukaUtas(id, u.id)} hapus={hapus} /></div>
          <div className="rel-identitas"><img src="/fuli-tanda.svg" alt="" /><p>Fakta, Uraian,<br />dan Literasi Indikator.</p></div>
          <footer className="rel-kaki"><a href={TAUTAN_WA} target="_blank" rel="noopener noreferrer"><Ikon nama="obrolan" ukuran={17} /> Hubungi petugas BPS <Ikon nama="keluar" ukuran={14} /></a><p>BPS Provinsi Maluku Utara</p></footer>
        </aside>

        {modus === "hero" ? (
          <main className="pembuka" onScroll={(e) => bingkai.current?.style.setProperty("--gulir-pembuka", `${e.currentTarget.scrollTop}px`)}>
            <div className="pembuka-isi">
              <div className="sapa"><span className="sapa-tanda" aria-hidden="true">✳</span> Selamat datang di Fuli</div>
              <h1>Kenali Maluku<br />Utara, lewat data.</h1>
              <p className="pembuka-sub">Dari pertanyaan sederhana hingga cerita di balik angka. Telusuri data BPS Maluku Utara bersama Fuli.</p>
              <Pengetik kirim={kirim} henti={hentikan} mengalir={mengalir} siap={!!id} tanda="Apa yang ingin Anda ketahui?" />
              <div className="contoh-judul"><span>Mulai dari rasa ingin tahu</span><Ikon nama="bawah" ukuran={16} /></div>
              <ul className="contoh" aria-label="Contoh pertanyaan">
                {CONTOH.map((c) => (
                  <li key={c.teks}><button type="button" onClick={() => kirim(c.teks)} disabled={!id}><span className="contoh-ikon"><Ikon nama={c.ikon} ukuran={19} /></span><span><strong>{c.judul}</strong><small>{c.teks}</small></span><Ikon nama="panah" ukuran={16} /></button></li>
                ))}
              </ul>
            </div>
            <footer className="pembuka-kaki"><span>Angka punya cerita. Mulai dengan bertanya.</span><p>Fuli bisa keliru. Periksa kembali angka penting di sumbernya.</p></footer>
          </main>
        ) : (
          <main className="ruang">
            <div className="ruang-judul"><span className="sapa-tanda" aria-hidden="true">✳</span><div><strong>{utas.find((u) => u.id === utasAktif)?.title || "Percakapan bersama Fuli"}</strong><span>Fakta, sumber, dan penjelasan dalam satu percakapan.</span></div></div>
            <div className="gulir" ref={gulir} onScroll={padaGulir}>
              <div className="kolom">
                {memuat && pesan.length === 0 && <p className="teks-redup memuat">Membuka percakapan.</p>}
                {id &&
                  pesan.map((m, i) => (
                    <PesanFuli key={m.id} p={m} id={id} utasId={utasAktif} tanya={kirim} baru={idBaru.has(m.id)} ulang={i === pesan.length - 1 ? ulangTerakhir : undefined} />
                  ))}
                {tawarkanNilai && <NilaiPercakapan kirim={nilai} />}
                {saran.length > 0 && !mengalir && (
                  <motion.ul className="saran" aria-label="Pertanyaan lanjutan" initial="sembunyi" animate="tampil" variants={{ tampil: { transition: { staggerChildren: 0.07 } } }}>
                    {saran.map((s) => (
                      <motion.li key={s} variants={{ sembunyi: { opacity: 0, y: 8 }, tampil: { opacity: 1, y: 0 } }}>
                        <button type="button" onClick={() => kirim(s)}>
                          {s}
                        </button>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </div>
            </div>
            <div className="dasar-bungkus">
            <div className="dasar-pengetik">
              <AnimatePresence>
                {!diBawah && (
                  <motion.button type="button" className="ke-bawah" onClick={keBawah} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} aria-label="Ke jawaban terbaru" title="Ke jawaban terbaru">
                    <Ikon nama="bawah" ukuran={18} />
                  </motion.button>
                )}
              </AnimatePresence>
              <Pengetik kirim={kirim} henti={hentikan} mengalir={mengalir} siap={!!id} tanda="Tanyakan lebih lanjut…" />
              <p className="catatan-jawaban">Fuli bisa keliru. Periksa angka penting di sumbernya.</p>
            </div>
            </div>
          </main>
        )}

        <AnimatePresence>
          {laci && (
            <motion.div className="laci-latar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLaci(false)}>
              <motion.aside
                className="laci"
                ref={dialogRiwayat}
                role="dialog"
                aria-modal="true"
                aria-label="Riwayat percakapan"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 36 }}
                onClick={(e) => e.stopPropagation()}
              >
                <header>
                  <h2>Riwayat</h2>
                  <button type="button" className="tombol-ikon" onClick={() => setLaci(false)} aria-label="Tutup riwayat" autoFocus>
                    <Ikon nama="tutup" />
                  </button>
                </header>
                <button type="button" className="tombol-baru" onClick={baru}>
                  <Ikon nama="tambah" ukuran={18} /> Percakapan baru
                </button>
                <DaftarUtas utas={utas} aktif={utasAktif} pilih={(u) => id && bukaUtas(id, u.id)} hapus={hapus} />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
