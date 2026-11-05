"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DataTabel, KonfigGrafik, MetaUi } from "@/lib/jenis";
import { profileChartData, profileToChartConfig } from "@/lib/chartDataProfiler";
import { formatSel, formatTerbukti, keCsv, keTsv, kodeSel, kolomAngka, namaBerkas, tautanAman, urutkanBaris } from "@/lib/olah";
import type { Identitas } from "@/lib/kurir";
import { ambilDokumen } from "@/lib/kurir";
import { Grafik } from "./Grafik";
import { Ikon } from "./Ikon";

export const TAUTAN_WA = "https://wa.me/6285176764422?text=Halo%20BPS%20Malut%2C%20saya%20butuh%20bantuan%20mencari%20data";

function Sel({ baris, kolom }: { baris: Record<string, unknown>; kolom: string }) {
  const kode = kodeSel(baris, kolom);
  return (
    <>
      {formatSel(baris[kolom], kolom)}
      {kode && (
        <sup className="kode-bps" title={kode.arti}>
          {kode.kode}
        </sup>
      )}
    </>
  );
}

function TabelInti({ kolom, baris }: { kolom: string[]; baris: Array<Record<string, unknown>> }) {
  const angkaKolom = useMemo(() => new Set(kolom.filter((k) => kolomAngka(k, baris))), [kolom, baris]);
  return (
    <div className="gulung-tabel" tabIndex={0}>
      <table className="tabel">
        <thead>
          <tr>
            {kolom.map((k) => (
              <th key={k} data-angka={angkaKolom.has(k)}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((r, i) => (
            <tr key={i}>
              {kolom.map((k) => (
                <td key={k} data-angka={angkaKolom.has(k)}>
                  <Sel baris={r} kolom={k} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function kunciEsc(tutup: () => void) {
  const f = (e: KeyboardEvent) => {
    if (e.key === "Escape") tutup();
  };
  window.addEventListener("keydown", f);
  return () => window.removeEventListener("keydown", f);
}

function Lembar({ judul, tutup, children }: { judul: string; tutup: () => void; children: React.ReactNode }) {
  useEffect(() => kunciEsc(tutup), [tutup]);
  // Lewat portal: leluhurnya punya animasi transform yang akan mengurung position: fixed.
  return createPortal(
    <motion.div className="lembar-latar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={tutup}>
      <motion.div
        className="lembar"
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        initial={{ y: "12%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "10%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lembar-kepala">
          <h3>{judul}</h3>
          <button type="button" className="tombol-ikon" onClick={tutup} aria-label="Tutup" autoFocus>
            <Ikon nama="tutup" />
          </button>
        </header>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function LembarTabel({ t, tutup }: { t: DataTabel; tutup: () => void }) {
  const tahunAda = Boolean(t.allRows?.length && t.availableYears?.length);
  const tahun = useMemo(() => [...(t.availableYears || [])].sort((a, b) => Number(b) - Number(a)), [t.availableYears]);
  const [pilih, setPilih] = useState<string | null>(t.defaultYear || tahun[0] || null);
  const [tersalin, setTersalin] = useState(false);

  const kolom = useMemo(() => {
    if (!tahunAda) return t.columns;
    return (t.allColumns || t.columns).filter((k) => k !== "Tahun");
  }, [t, tahunAda]);

  const baris = useMemo(() => {
    if (!tahunAda) return urutkanBaris(t, t.rows, t.columns);
    const saring = (t.allRows || []).filter((r) => String(r.Tahun) === String(pilih));
    return urutkanBaris(t, saring, kolom);
  }, [t, tahunAda, pilih, kolom]);

  const unduh = () => {
    const blob = new Blob([`﻿${keCsv(kolom, baris)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = namaBerkas(t.title);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(keTsv(kolom, baris));
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1800);
    } catch {
      setTersalin(false);
    }
  };

  const situs = tautanAman(t.bps_web_url);

  return (
    <Lembar judul={t.title || "Tabel data"} tutup={tutup}>
      {tahunAda && (
        <div className="pilih-tahun" role="tablist" aria-label="Pilih tahun">
          {tahun.map((y) => (
            <button key={y} type="button" role="tab" aria-selected={String(y) === String(pilih)} onClick={() => setPilih(y)}>
              {y}
            </button>
          ))}
        </div>
      )}
      <div className="lembar-isi">
        <TabelInti kolom={kolom} baris={baris} />
      </div>
      <footer className="lembar-kaki">
        <button type="button" className="tombol-sekunder" onClick={unduh}>
          <Ikon nama="unduh" ukuran={18} /> Unduh CSV
        </button>
        <button type="button" className="tombol-sekunder" onClick={salin}>
          <Ikon nama={tersalin ? "centang" : "salin"} ukuran={18} /> {tersalin ? "Tersalin" : "Salin tabel"}
        </button>
        {situs && (
          <a className="tombol-sekunder" href={situs} target="_blank" rel="noopener noreferrer">
            <Ikon nama="keluar" ukuran={18} /> Buka di situs BPS
          </a>
        )}
      </footer>
    </Lembar>
  );
}

function BlokTabel({ t, konfig }: { t: DataTabel; konfig?: KonfigGrafik | null }) {
  const baris = useMemo(() => urutkanBaris(t, t.rows, t.columns), [t]);
  const konfigAkhir = useMemo(() => {
    const pastikanSatuan = (k: KonfigGrafik): KonfigGrafik => ({
      ...k,
      y_axis: {
        ...k.y_axis,
        format: formatTerbukti(k.y_axis?.format, [
          t.title,
          k.chart_title,
          k.chart_subtitle,
          k.y_axis?.label,
          ...t.columns,
          ...k.series.map((s) => s.label || s.column),
        ]),
      },
    });
    if (konfig?.should_render && konfig.series?.length) return pastikanSatuan(konfig);
    if (konfig === null || baris.length <= 2) return null;
    try {
      const k = profileToChartConfig(profileChartData(t.columns, baris), t.title || undefined) as KonfigGrafik;
      return k?.should_render && k.series?.length ? pastikanSatuan(k) : null;
    } catch {
      return null;
    }
  }, [konfig, t, baris]);

  const [lihat, setLihat] = useState<"grafik" | "tabel">(konfigAkhir ? "grafik" : "tabel");
  const [lembar, setLembar] = useState(false);
  const BATAS = 8;
  const total = t.total_rows || t.allRows?.length || baris.length;
  const adaLebih = total > Math.min(BATAS, baris.length) || Boolean(t.allRows?.length);

  return (
    <section className="blok-data">
      <header>
        <h3>{konfigAkhir?.chart_title || t.title || "Data"}</h3>
        {konfigAkhir?.chart_subtitle && <p>{konfigAkhir.chart_subtitle}</p>}
        {konfigAkhir && (
          <div className="pilih-lihat" role="tablist" aria-label="Pilih tampilan data">
            <button type="button" role="tab" aria-selected={lihat === "grafik"} onClick={() => setLihat("grafik")}>
              Grafik
            </button>
            <button type="button" role="tab" aria-selected={lihat === "tabel"} onClick={() => setLihat("tabel")}>
              Tabel
            </button>
          </div>
        )}
      </header>
      {lihat === "grafik" && konfigAkhir ? (
        <Grafik konfig={konfigAkhir} baris={baris} judul={t.title || ""} />
      ) : (
        <TabelInti kolom={t.columns} baris={baris.slice(0, BATAS)} />
      )}
      {(lihat === "tabel" || adaLebih) && (
        <button type="button" className="tautan-teks" onClick={() => setLembar(true)}>
          {t.allRows?.length ? "Lihat semua tahun" : `Lihat semua ${total.toLocaleString("id-ID")} baris`}
        </button>
      )}
      <AnimatePresence>{lembar && <LembarTabel t={t} tutup={() => setLembar(false)} />}</AnimatePresence>
    </section>
  );
}

type Dok = Awaited<ReturnType<typeof ambilDokumen>>;

function LembarDokumen({ id, dokId, judul, tutup }: { id: Identitas; dokId: number; judul: string; tutup: () => void }) {
  const [dok, setDok] = useState<Dok | null>(null);
  const [gagal, setGagal] = useState(false);
  useEffect(() => {
    let hidup = true;
    ambilDokumen(id, dokId)
      .then((d) => hidup && setDok(d))
      .catch(() => hidup && setGagal(true));
    return () => {
      hidup = false;
    };
  }, [id, dokId]);
  const pdf = tautanAman(dok?.pdf_url);
  const asal = tautanAman(dok?.source_url);
  return (
    <Lembar judul={dok?.title || judul} tutup={tutup}>
      <div className="lembar-isi lembar-teks">
        {!dok && !gagal && <p className="teks-redup">Membuka dokumen.</p>}
        {gagal && <p>Rincian dokumen ini belum bisa dibuka. Tanyakan isinya langsung ke Fuli.</p>}
        {dok && <p>{dok.abstract || dok.summary || "Dokumen ini tidak punya ringkasan. Tanyakan isinya langsung ke Fuli."}</p>}
      </div>
      {(pdf || asal) && (
        <footer className="lembar-kaki">
          {pdf && (
            <a className="tombol-sekunder" href={pdf} target="_blank" rel="noopener noreferrer">
              <Ikon nama="unduh" ukuran={18} /> Buka PDF
            </a>
          )}
          {asal && !pdf && (
            <a className="tombol-sekunder" href={asal} target="_blank" rel="noopener noreferrer">
              <Ikon nama="keluar" ukuran={18} /> Buka sumber
            </a>
          )}
        </footer>
      )}
    </Lembar>
  );
}

export function BlokUi({ ui, id, tanya }: { ui: MetaUi; id: Identitas; tanya: (t: string) => void }) {
  const [dok, setDok] = useState<{ id: number; judul: string } | null>(null);
  const [istilah, setIstilah] = useState(false);
  const [calonPenuh, setCalonPenuh] = useState(false);

  const adaData = (t?: DataTabel) => Boolean(t && t.kind !== "search" && t.rows?.length);
  const adaTabel = adaData(ui.table) || adaData(ui.table2);
  const calon = ui.candidates || [];
  const calonDok = ui.knowledgeCandidates || [];
  const sumberDok = (ui.sources || []).filter((s) => s.type === "knowledge" || s.type === "publication" || s.type === "document");
  const sumberLain = (ui.sources || []).filter((s) => !sumberDok.includes(s));
  const luar = (ui.externalLinks || []).filter((l) => tautanAman(l.url));
  const definisi = ui.dnaMetadata?.items || [];

  return (
    <div className="blok-ui">
      {adaData(ui.table) && <BlokTabel t={ui.table as DataTabel} konfig={ui.chart ?? undefined} />}
      {adaData(ui.table2) && <BlokTabel t={ui.table2 as DataTabel} konfig={null} />}

      {calon.length > 0 && (
        <section className="pilihan">
          <h3>{adaTabel ? "Data lain yang mungkin dimaksud" : "Pilih data yang dimaksud"}</h3>
          <ul>
            {calon.slice(0, adaTabel && !calonPenuh ? 2 : 8).map((c) => (
              <li key={`${c.type}-${c.id}`}>
                <button type="button" onClick={() => tanya(c.name)}>
                  <span>{c.name}</span>
                  {c.latest && <small>Data terbaru {c.latest}</small>}
                </button>
              </li>
            ))}
          </ul>
          {adaTabel && !calonPenuh && calon.length > 2 && (
            <button type="button" className="tautan-teks" onClick={() => setCalonPenuh(true)}>
              Lihat {Math.min(calon.length, 8) - 2} pilihan lainnya
            </button>
          )}
        </section>
      )}

      {calonDok.length > 0 && (
        <section className="pilihan">
          <h3>Dokumen yang relevan</h3>
          <ul>
            {calonDok.slice(0, 6).map((c) => (
              <li key={`${c.type}-${c.id}`}>
                <button type="button" onClick={() => setDok({ id: c.id, judul: c.name })}>
                  <Ikon nama="dokumen" ukuran={18} />
                  <span>{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ui.confidence?.level === "low" && !adaTabel && (
        <p className="catatan-rendah">
          Fuli belum yakin dengan hasil ini. Petugas BPS Maluku Utara bisa membantu lewat{" "}
          <a href={TAUTAN_WA} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          .
        </p>
      )}

      {(sumberDok.length > 0 || sumberLain.length > 0 || luar.length > 0 || definisi.length > 0) && (
        <div className="sumber">
          {(sumberDok.length > 0 || sumberLain.length > 0) && (
            <div className="sumber-baris">
              <span>Sumber</span>
              {sumberDok.slice(0, 5).map((s) => (
                <button key={`${s.type}-${s.id}`} type="button" onClick={() => setDok({ id: s.id, judul: s.title })}>
                  {s.title}
                </button>
              ))}
              {sumberLain.slice(0, 5).map((s) => (
                <em key={`${s.type}-${s.id}`}>{s.title}</em>
              ))}
            </div>
          )}
          {luar.length > 0 && (
            <div className="sumber-baris">
              <span>Dari situs lain</span>
              {luar.slice(0, 5).map((l) => (
                <a key={l.url} href={tautanAman(l.url) as string} target="_blank" rel="noopener noreferrer" title={l.snippet}>
                  {l.title || l.domain}
                </a>
              ))}
            </div>
          )}
          {definisi.length > 0 && (
            <div className="istilah">
              <button type="button" className="tautan-teks" aria-expanded={istilah} onClick={() => setIstilah((v) => !v)}>
                {istilah ? "Sembunyikan arti istilah" : "Arti istilah"}
              </button>
              <AnimatePresence initial={false}>
                {istilah && (
                  <motion.dl initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    {definisi.slice(0, 4).map((d) => (
                      <div key={d.nama}>
                        <dt>{d.nama}</dt>
                        <dd>
                          {d.definisi || d.konsep}
                          {d.satuan && ` Satuan: ${d.satuan}.`}
                          {d.frekuensi && ` Frekuensi: ${d.frekuensi}.`}
                        </dd>
                      </div>
                    ))}
                  </motion.dl>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>{dok && <LembarDokumen id={id} dokId={dok.id} judul={dok.judul} tutup={() => setDok(null)} />}</AnimatePresence>
    </div>
  );
}
