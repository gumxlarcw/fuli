"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Pesan } from "@/lib/jenis";
import { detik, tautanAman } from "@/lib/olah";
import type { Identitas } from "@/lib/kurir";
import { laporkan, pisahkanBlokUi, rapikanTeks } from "@/lib/kurir";
import { BlokUi } from "./BlokData";
import { Ikon } from "./Ikon";

const KOMPONEN: Components = {
  a({ href, children }) {
    const aman = tautanAman(href);
    if (!aman) return <>{children}</>;
    return (
      <a href={aman} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="gulung-tabel" tabIndex={0}>
        <table className="tabel">{children}</table>
      </div>
    );
  },
};

const TeksMarkdown = memo(function TeksMarkdown({ teks }: { teks: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={KOMPONEN}>
      {teks}
    </Markdown>
  );
});

/** Teks mengalir rata: aliran token yang tersendat tetap terbaca seperti orang menulis. */
function useTeksHalus(sasaran: string, mengalir: boolean) {
  const [panjang, setPanjang] = useState(mengalir ? 0 : sasaran.length);
  const jalan = useRef(mengalir);
  const sasaranRef = useRef(sasaran);
  sasaranRef.current = sasaran;

  useEffect(() => {
    if (mengalir) jalan.current = true;
    if (!jalan.current) {
      setPanjang(sasaran.length);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPanjang(sasaran.length);
      return;
    }
    let raf = 0;
    let lalu = 0;
    const langkah = (w: number) => {
      raf = requestAnimationFrame(langkah);
      if (w - lalu < 30) return;
      lalu = w;
      setPanjang((p) => {
        const tujuan = sasaranRef.current.length;
        if (p >= tujuan) return tujuan;
        const sisa = tujuan - p;
        return p + Math.max(2, Math.ceil(sisa / 14));
      });
    };
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [mengalir, sasaran.length]);

  return { teks: sasaran.slice(0, panjang), habis: panjang >= sasaran.length };
}

function JejakKerja({ p }: { p: Pesan }) {
  const [buka, setBuka] = useState(false);
  const berjalan = p.keadaan === "mengalir";
  const sudahMenulis = p.teks.length > 0;
  const langkah = p.tahap;
  // Saat gagal, nalar berisi pesan galat yang sudah tampil di gelembung; jejak kosong tidak perlu disebut.
  if (p.keadaan === "gagal" || (!berjalan && langkah.length === 0 && !p.nalar)) return null;

  if (berjalan && !sudahMenulis) {
    return (
      <ol className="jejak" aria-live="polite">
        <AnimatePresence initial={false}>
          {langkah.length === 0 && (
            <motion.li key="mulai" className="jejak-butir" data-selesai={false} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
              <span className="jejak-tanda" />
              <span>Membaca pertanyaan</span>
            </motion.li>
          )}
          {langkah.map((t) => (
            <motion.li key={t.tahap} className="jejak-butir" data-selesai={t.selesai} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }}>
              <span className="jejak-tanda">
                {t.selesai && (
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
                    <path d="M4 10.5l4 4 8-9" pathLength={1} className="centang-gambar" />
                  </svg>
                )}
              </span>
              <span>
                {t.label}
                {t.detail && !t.selesai && <small>{t.detail}</small>}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    );
  }

  if (berjalan) {
    const akhir = langkah[langkah.length - 1];
    return (
      <p className="jejak-ringkas" aria-live="polite">
        <span className="jejak-tanda" data-selesai={false} />
        {akhir?.label || "Menulis jawaban"}
      </p>
    );
  }

  const ringkas = p.durasiMs != null ? `Selesai dalam ${detik(p.durasiMs)}` : `${langkah.length} langkah kerja`;
  return (
    <div className="jejak-selesai">
      <button type="button" aria-expanded={buka} onClick={() => setBuka((v) => !v)}>
        {ringkas}
      </button>
      <AnimatePresence initial={false}>
        {buka && (
          <motion.div className="jejak-rincian" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
            <ol>
              {langkah.map((t) => (
                <li key={t.tahap}>
                  {t.label}
                  {t.detail && <small>{t.detail}</small>}
                </li>
              ))}
            </ol>
            {p.nalar && <p className="jejak-nalar">{p.nalar}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const JENIS_LAPOR: Array<[string, string]> = [
  ["wrong_data", "Angkanya salah"],
  ["incomplete", "Kurang lengkap"],
  ["irrelevant", "Tidak menjawab pertanyaan"],
  ["wrong_source", "Sumbernya salah"],
  ["other", "Masalah lain"],
];

function AksiPesan({ p, id, utasId }: { p: Pesan; id: Identitas; utasId: number | null }) {
  const [tersalin, setTersalin] = useState(false);
  const [pilih, setPilih] = useState<"suka" | "tidak" | null>(null);
  const [lapor, setLapor] = useState(false);
  const [hasil, setHasil] = useState<string | null>(null);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(p.teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1600);
    } catch {
      setTersalin(false);
    }
  };

  const kirim = async (jenis: string) => {
    try {
      await laporkan(id, { message_id: String(p.idBackend ?? p.id), thread_id: utasId, flag_type: jenis });
      setHasil("Laporan tersimpan.");
    } catch {
      setHasil("Laporan gagal terkirim. Coba lagi.");
    }
    setLapor(false);
  };

  return (
    <div className="aksi-pesan">
      <button type="button" className="tombol-ikon kecil" onClick={salin} aria-label={tersalin ? "Tersalin" : "Salin jawaban"} title="Salin jawaban">
        <Ikon nama={tersalin ? "centang" : "salin"} ukuran={18} />
      </button>
      <button type="button" className="tombol-ikon kecil" aria-pressed={pilih === "suka"} onClick={() => setPilih((v) => (v === "suka" ? null : "suka"))} aria-label="Jawaban membantu" title="Jawaban membantu">
        <Ikon nama="suka" ukuran={18} />
      </button>
      <button type="button" className="tombol-ikon kecil" aria-pressed={pilih === "tidak"} onClick={() => setPilih((v) => (v === "tidak" ? null : "tidak"))} aria-label="Jawaban kurang membantu" title="Jawaban kurang membantu">
        <Ikon nama="tidaksuka" ukuran={18} />
      </button>
      <button type="button" className="tombol-ikon kecil" aria-expanded={lapor} onClick={() => setLapor((v) => !v)} aria-label="Laporkan jawaban" title="Laporkan jawaban">
        <Ikon nama="bendera" ukuran={18} />
      </button>
      {hasil && (
        <span className="aksi-hasil" role="status">
          {hasil}
        </span>
      )}
      <AnimatePresence>
        {lapor && (
          <motion.div className="menu-lapor" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            {JENIS_LAPOR.map(([k, l]) => (
              <button key={k} type="button" onClick={() => kirim(k)}>
                {l}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PesanFuliInti({
  p,
  id,
  utasId,
  tanya,
  ulang,
  baru,
}: {
  p: Pesan;
  id: Identitas;
  utasId: number | null;
  tanya: (t: string) => void;
  ulang?: () => void;
  baru: boolean;
}) {
  const bersih = rapikanTeks(pisahkanBlokUi(p.teks).teks);
  const mengalir = p.keadaan === "mengalir";
  const { teks, habis } = useTeksHalus(bersih, mengalir);
  const selesai = !mengalir && habis;

  if (p.peran === "user") {
    return (
      <motion.div className="pesan-tanya" initial={baru ? { opacity: 0, y: 18, scale: 0.98 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}>
        {p.teks}
      </motion.div>
    );
  }

  return (
    <motion.article className="pesan-jawab" initial={baru ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <JejakKerja p={p} />
      {teks && (
        <div className="teks-fuli" data-mengalir={!selesai}>
          <TeksMarkdown teks={teks} />
        </div>
      )}
      {p.keadaan === "gagal" && (
        <div className="pesan-galat" role="alert">
          <p>{p.nalar || "Fuli tidak bisa dihubungi. Periksa sambungan, lalu kirim ulang."}</p>
          {ulang && (
            <button type="button" className="tombol-sekunder" onClick={ulang}>
              <Ikon nama="segar" ukuran={18} /> Kirim ulang
            </button>
          )}
        </div>
      )}
      {p.keadaan === "dihentikan" && !teks && <p className="teks-redup">Jawaban dihentikan.</p>}
      {p.ui && selesai && <BlokUi ui={p.ui} id={id} tanya={tanya} />}
      {selesai && p.keadaan === "selesai" && teks && <AksiPesan p={{ ...p, teks: bersih }} id={id} utasId={utasId} />}
    </motion.article>
  );
}

export const PesanFuli = memo(PesanFuliInti);
