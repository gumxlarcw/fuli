"use client";

/**
 * Grafik SVG buatan sendiri. Ukurannya mengikuti lebar wadah, gambarnya tumbuh dari garis dasar.
 * Satu sumbu saja. Warna seri mengikuti urutan kolom, teks selalu memakai warna tinta.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { KonfigGrafik } from "@/lib/jenis";
import { formatNilai, formatSumbu, siapkanGrafik, tickRapi, type DataGrafik, type FormatSumbu } from "@/lib/olah";

const warna = (i: number) => `var(--seri-${(i % 6) + 1})`;

function potong(teks: string, maks: number) {
  return teks.length > maks ? `${teks.slice(0, maks - 1)}…` : teks;
}

/** Ujung data membulat 4px, sisi garis dasar tetap persegi. */
function batangTegak(x: number, y: number, l: number, t: number, turun: boolean) {
  const r = Math.min(4, l / 2, t);
  if (t <= 0) return "";
  return turun
    ? `M${x} ${y}H${x + l}V${y + t - r}Q${x + l} ${y + t} ${x + l - r} ${y + t}H${x + r}Q${x} ${y + t} ${x} ${y + t - r}Z`
    : `M${x} ${y + t}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + l - r}Q${x + l} ${y} ${x + l} ${y + r}V${y + t}Z`;
}

function batangDatar(x: number, y: number, p: number, t: number, kiri: boolean) {
  const r = Math.min(4, t / 2, p);
  if (p <= 0) return "";
  return kiri
    ? `M${x + p} ${y}V${y + t}H${x + r}Q${x} ${y + t} ${x} ${y + t - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`
    : `M${x} ${y}H${x + p - r}Q${x + p} ${y} ${x + p} ${y + r}V${y + t - r}Q${x + p} ${y + t} ${x + p - r} ${y + t}H${x}Z`;
}

type Jenis = "garis" | "tegak" | "datar" | "donat";

function pilihJenis(k: KonfigGrafik, d: DataGrafik, lebar: number): Jenis {
  const n = d.label.length;
  const adaNegatif = d.seri.some((s) => s.nilai.some((v) => v != null && v < 0));
  if (k.chart_type === "pie") return n <= 6 && !adaNegatif ? "donat" : "datar";
  if ((k.chart_type === "line" || k.chart_type === "area") && n > 1) return "garis";
  if (k.options?.orientation === "horizontal") return "datar";
  const panjang = Math.max(0, ...d.label.map((l) => l.length));
  const ruang = lebar / Math.max(1, n);
  return panjang * 6.4 > ruang * 1.5 ? "datar" : "tegak";
}

function Legenda({ seri }: { seri: DataGrafik["seri"] }) {
  if (seri.length < 2) return null;
  return (
    <ul className="legenda">
      {seri.map((s, i) => (
        <li key={s.label}>
          <i style={{ background: warna(i) }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ d, i, f, x, y, lebar }: { d: DataGrafik; i: number; f: FormatSumbu; x: number; y: number; lebar: number }) {
  const kanan = x > lebar * 0.58;
  return (
    <div className="tip" style={{ left: kanan ? undefined : x + 14, right: kanan ? lebar - x + 14 : undefined, top: y }}>
      <strong>{d.label[i]}</strong>
      {d.seri.map((s, k) => (
        <span key={s.label}>
          {d.seri.length > 1 && <i style={{ background: warna(k) }} />}
          {d.seri.length > 1 && <em>{s.label}</em>}
          <b>{formatNilai(s.nilai[i], f)}</b>
        </span>
      ))}
    </div>
  );
}

function Donat({ d, f }: { d: DataGrafik; f: FormatSumbu }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const nilai = d.seri[0].nilai.map((v) => Math.max(0, v ?? 0));
  const total = nilai.reduce((a, b) => a + b, 0) || 1;
  let jalan = 0;
  const r = 58;
  const tampil = aktif ?? nilai.indexOf(Math.max(...nilai));
  return (
    <div className="donat">
      <svg viewBox="0 0 160 160" role="img" aria-label={`Komposisi ${d.seri[0].label}`}>
        {nilai.map((v, i) => {
          const p = (v / total) * 100;
          const celah = Math.min(0.9, p / 3);
          const awal = jalan;
          jalan += p;
          return (
            <circle
              key={d.label[i]}
              className="irisan"
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={warna(i)}
              strokeWidth={aktif === i ? 26 : 22}
              pathLength={100}
              strokeDasharray={`${Math.max(0, p - celah)} ${100 - Math.max(0, p - celah)}`}
              strokeDashoffset={25 - awal}
              style={{ animationDelay: `${i * 70}ms` }}
              onPointerEnter={() => setAktif(i)}
              onPointerLeave={() => setAktif(null)}
            />
          );
        })}
        <text x="80" y="76" textAnchor="middle" className="donat-persen">
          {((nilai[tampil] / total) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
        </text>
        <text x="80" y="94" textAnchor="middle" className="donat-label">
          {potong(d.label[tampil], 18)}
        </text>
      </svg>
      <ul className="donat-daftar">
        {d.label.map((l, i) => (
          <li key={l} data-aktif={aktif === i} onPointerEnter={() => setAktif(i)} onPointerLeave={() => setAktif(null)}>
            <i style={{ background: warna(i) }} />
            <span>{l}</span>
            <b>{formatNilai(nilai[i], f)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BatangDatar({ d, k, f, lebar }: { d: DataGrafik; k: KonfigGrafik; f: FormatSumbu; lebar: number }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [yPenunjuk, setYPenunjuk] = useState(0);
  const tumpuk = k.chart_type === "stacked-bar" || k.options?.stacked === true;
  const seriN = d.seri.length;
  const sampingan = seriN > 1 && !tumpuk;
  const tebal = sampingan ? Math.max(8, Math.min(14, 44 / seriN)) : 18;
  const tinggiBaris = sampingan ? seriN * (tebal + 2) + 12 : 30;
  const panjangLabel = Math.max(...d.label.map((l) => Math.min(l.length, 26)));
  const kiri = Math.min(lebar * 0.42, panjangLabel * 6.7 + 8);
  const kanan = seriN === 1 ? 72 : 16;
  const tinggi = d.label.length * tinggiBaris + 26;
  const plot = Math.max(40, lebar - kiri - kanan);

  const jumlah = d.label.map((_, i) => d.seri.reduce((a, s) => a + Math.max(0, s.nilai[i] ?? 0), 0));
  const semua = d.seri.flatMap((s) => s.nilai).filter((v): v is number => v != null);
  const maks = tumpuk ? Math.max(0, ...jumlah) : Math.max(0, ...semua);
  const min = Math.min(0, ...semua);
  const tick = tickRapi(min, maks, lebar < 460 ? 3 : 5);
  const atas = tick[tick.length - 1];
  const bawah = tick[0];
  const sx = (v: number) => kiri + ((v - bawah) / (atas - bawah || 1)) * plot;
  const nol = sx(0);

  const gerak = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - r.top;
    setYPenunjuk(y);
    const i = Math.floor(y / tinggiBaris);
    setAktif(i >= 0 && i < d.label.length ? i : null);
  };

  return (
    <div className="kanvas-grafik">
      <svg width={lebar} height={tinggi} role="img" aria-label={`Grafik batang ${k.chart_title || ""}`} onPointerMove={gerak} onPointerDown={gerak} onPointerLeave={() => setAktif(null)}>
        {tick.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={0} y2={tinggi - 22} className="garis-bantu" />
            <text x={sx(t)} y={tinggi - 6} textAnchor="middle" className="teks-sumbu">
              {formatSumbu(t, f)}
            </text>
          </g>
        ))}
        {d.label.map((l, i) => {
          const y = i * tinggiBaris;
          const redup = aktif != null && aktif !== i;
          let tumpukan = 0;
          return (
            <g key={`${l}-${i}`} opacity={redup ? 0.5 : 1} className="baris-grafik">
              <text x={kiri - 8} y={y + tinggiBaris / 2 + 4} textAnchor="end" className="teks-kategori">
                {potong(l, Math.max(8, Math.floor((kiri - 8) / 6.4)))}
              </text>
              {d.seri.map((s, si) => {
                const v = s.nilai[i];
                if (v == null) return null;
                if (tumpuk) {
                  const x = sx(tumpukan);
                  tumpukan += Math.max(0, v);
                  const p = Math.max(0, sx(tumpukan) - x - (si < seriN - 1 ? 2 : 0));
                  const akhir = si === seriN - 1;
                  return (
                    <path
                      key={s.label}
                      className="tumbuh-x"
                      style={{ animationDelay: `${i * 34}ms` }}
                      d={akhir ? batangDatar(x, y + (tinggiBaris - tebal) / 2, p, tebal, false) : `M${x} ${y + (tinggiBaris - tebal) / 2}h${p}v${tebal}h${-p}Z`}
                      fill={warna(si)}
                    />
                  );
                }
                const yb = sampingan ? y + 6 + si * (tebal + 2) : y + (tinggiBaris - tebal) / 2;
                const negatif = v < 0;
                const p = Math.abs(sx(v) - nol);
                return (
                  <g key={s.label}>
                    <path
                      className={negatif ? "tumbuh-x-kiri" : "tumbuh-x"}
                      style={{ animationDelay: `${i * 34}ms` }}
                      d={batangDatar(negatif ? nol - p : nol, yb, p, tebal, negatif)}
                      fill={warna(si)}
                    />
                    {seriN === 1 && (
                      <text x={negatif ? nol - p - 6 : nol + p + 6} y={yb + tebal / 2 + 4} textAnchor={negatif ? "end" : "start"} className="teks-nilai">
                        {formatSumbu(v, f)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {aktif != null && <Tooltip d={d} i={aktif} f={f} x={Math.min(lebar - 60, kiri + 30)} y={Math.max(0, yPenunjuk - 20)} lebar={lebar} />}
    </div>
  );
}

function SumbuTegak({ d, k, f, lebar, jenis }: { d: DataGrafik; k: KonfigGrafik; f: FormatSumbu; lebar: number; jenis: "garis" | "tegak" }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [yPenunjuk, setYPenunjuk] = useState(0);
  const tumpuk = jenis === "tegak" && (k.chart_type === "stacked-bar" || k.options?.stacked === true);
  const n = d.label.length;
  const seriN = d.seri.length;
  const tinggi = lebar < 520 ? 240 : 290;
  const atasPlot = 18;
  const bawahPlot = 30;
  const tinggiPlot = tinggi - atasPlot - bawahPlot;

  const semua = d.seri.flatMap((s) => s.nilai).filter((v): v is number => v != null);
  const jumlah = d.label.map((_, i) => d.seri.reduce((a, s) => a + Math.max(0, s.nilai[i] ?? 0), 0));
  const maksData = tumpuk ? Math.max(0, ...jumlah) : Math.max(...semua, jenis === "tegak" || k.chart_type === "area" ? 0 : -Infinity);
  // Batang dan luas wajib berdasar nol; garis boleh mengikuti rentang datanya.
  const minData = Math.min(...semua, jenis === "tegak" || k.chart_type === "area" ? 0 : Infinity);
  const tick = tickRapi(minData, maksData, 5);
  const puncak = tick[tick.length - 1];
  const dasar = tick[0];
  const sy = (v: number) => atasPlot + (1 - (v - dasar) / (puncak - dasar || 1)) * tinggiPlot;

  const kiri = Math.max(34, Math.max(...tick.map((t) => formatSumbu(t, f).length)) * 6.8 + 8);
  const akhirTerbaca = jenis === "garis" && seriN <= 4;
  const kanan = akhirTerbaca ? Math.min(74, Math.max(...d.seri.map((s) => formatSumbu(s.nilai[n - 1] ?? 0, f).length)) * 7 + 18) : 12;
  const tinggiNol = sy(Math.max(dasar, Math.min(0, puncak)));
  const lebarPlot = Math.max(40, lebar - kiri - kanan);
  const pita = lebarPlot / Math.max(1, n);
  const sxGaris = (i: number) => kiri + (n === 1 ? lebarPlot / 2 : (i / (n - 1)) * lebarPlot);
  const sxPita = (i: number) => kiri + i * pita + pita / 2;
  const sx = jenis === "garis" ? sxGaris : sxPita;

  const gerak = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    setYPenunjuk(e.clientY - r.top);
    const i = jenis === "garis" ? Math.round(((x - kiri) / lebarPlot) * (n - 1)) : Math.floor((x - kiri) / pita);
    setAktif(Math.max(0, Math.min(n - 1, i)));
  };

  const papan = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setAktif((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setAktif((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Escape") setAktif(null);
    else return;
    e.preventDefault();
  };

  const jarakLabel = Math.max(1, Math.ceil((Math.max(...d.label.map((l) => Math.min(l.length, 12))) * 6.6 + 12) / (jenis === "garis" ? lebarPlot / Math.max(1, n - 1) : pita)));

  const posisiAkhir = d.seri.map((s) => {
    const v = s.nilai[n - 1];
    return v == null ? null : sy(v);
  });
  const akhirBentrok = posisiAkhir.some((a, i) => a != null && posisiAkhir.some((b, j) => j > i && b != null && Math.abs(a - b) < 15));

  return (
    <div className="kanvas-grafik">
      <svg
        width={lebar}
        height={tinggi}
        role="img"
        tabIndex={0}
        aria-label={`${jenis === "garis" ? "Grafik garis" : "Grafik batang"} ${k.chart_title || ""}. Gunakan panah kiri dan kanan untuk membaca nilai.`}
        onPointerMove={gerak}
        onPointerDown={gerak}
        onPointerLeave={() => setAktif(null)}
        onKeyDown={papan}
      >
        {tick.map((t) => (
          <g key={t}>
            <line x1={kiri} x2={lebar - kanan} y1={sy(t)} y2={sy(t)} className={t === 0 ? "garis-nol" : "garis-bantu"} />
            <text x={kiri - 8} y={sy(t) + 4} textAnchor="end" className="teks-sumbu">
              {formatSumbu(t, f)}
            </text>
          </g>
        ))}
        {d.label.map((l, i) =>
          i % jarakLabel === 0 || (jenis === "tegak" && jarakLabel === 1) ? (
            <text key={`${l}-${i}`} x={sx(i)} y={tinggi - 10} textAnchor="middle" className="teks-sumbu">
              {potong(l, 12)}
            </text>
          ) : null,
        )}

        {jenis === "garis" && aktif != null && <line x1={sx(aktif)} x2={sx(aktif)} y1={atasPlot} y2={atasPlot + tinggiPlot} className="garis-silang" />}

        {jenis === "garis" &&
          d.seri.map((s, si) => {
            const potongan: string[] = [];
            let jalur = "";
            s.nilai.forEach((v, i) => {
              if (v == null) {
                if (jalur) potongan.push(jalur);
                jalur = "";
                return;
              }
              jalur += `${jalur ? "L" : "M"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`;
            });
            if (jalur) potongan.push(jalur);
            const luas =
              k.chart_type === "area"
                ? potongan.map((p) => {
                    const titik = p.match(/[ML][\d.]+/g) || [];
                    const xAwal = titik[0]?.slice(1);
                    const xAkhir = titik[titik.length - 1]?.slice(1);
                    return `${p}L${xAkhir} ${tinggiNol}L${xAwal} ${tinggiNol}Z`;
                  })
                : [];
            const akhir = s.nilai[n - 1];
            return (
              <g key={s.label}>
                {luas.map((p) => (
                  <path key={p} d={p} fill={warna(si)} className="luas" />
                ))}
                {potongan.map((p) => (
                  <path key={p} d={p} fill="none" stroke={warna(si)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="gambar-garis" style={{ animationDelay: `${si * 120}ms` }} />
                ))}
                {akhir != null && (
                  <circle cx={sx(n - 1)} cy={sy(akhir)} r={4} fill={warna(si)} className="titik-ujung" />
                )}
                {akhirTerbaca && !akhirBentrok && akhir != null && (
                  <text x={sx(n - 1) + 9} y={sy(akhir) + 4} className="teks-nilai">
                    {formatSumbu(akhir, f)}
                  </text>
                )}
                {aktif != null && s.nilai[aktif] != null && <circle cx={sx(aktif)} cy={sy(s.nilai[aktif] as number)} r={4.5} fill={warna(si)} className="titik-ujung" />}
              </g>
            );
          })}

        {jenis === "tegak" &&
          d.label.map((l, i) => {
            const redup = aktif != null && aktif !== i;
            const sampingan = seriN > 1 && !tumpuk;
            const lebarB = Math.min(24, sampingan ? (pita * 0.76 - (seriN - 1) * 2) / seriN : pita * 0.62);
            const totalB = sampingan ? seriN * lebarB + (seriN - 1) * 2 : lebarB;
            const xKiri = sxPita(i) - totalB / 2;
            let tumpukan = 0;
            return (
              <g key={`${l}-${i}`} opacity={redup ? 0.5 : 1} className="baris-grafik">
                {d.seri.map((s, si) => {
                  const v = s.nilai[i];
                  if (v == null) return null;
                  if (tumpuk) {
                    const yBawah = sy(tumpukan);
                    tumpukan += Math.max(0, v);
                    const yAtas = sy(tumpukan);
                    const t = Math.max(0, yBawah - yAtas - (si < seriN - 1 ? 2 : 0));
                    const akhir = si === seriN - 1;
                    return (
                      <path
                        key={s.label}
                        className="tumbuh-y"
                        style={{ animationDelay: `${i * 34}ms` }}
                        d={akhir ? batangTegak(xKiri, yAtas, lebarB, t, false) : `M${xKiri} ${yAtas}h${lebarB}v${t}h${-lebarB}Z`}
                        fill={warna(si)}
                      />
                    );
                  }
                  const x = sampingan ? xKiri + si * (lebarB + 2) : xKiri;
                  const negatif = v < 0;
                  const t = Math.abs(sy(v) - tinggiNol);
                  const yb = negatif ? tinggiNol : tinggiNol - t;
                  return (
                    <g key={s.label}>
                      <path className={negatif ? "tumbuh-y-bawah" : "tumbuh-y"} style={{ animationDelay: `${i * 34}ms` }} d={batangTegak(x, yb, lebarB, t, negatif)} fill={warna(si)} />
                      {seriN === 1 && n <= 12 && pita >= 38 && (
                        <text x={x + lebarB / 2} y={negatif ? yb + t + 14 : yb - 6} textAnchor="middle" className="teks-nilai">
                          {formatSumbu(v, f)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
      </svg>
      {aktif != null && <Tooltip d={d} i={aktif} f={f} x={sx(aktif)} y={Math.max(0, Math.min(tinggi - 90, yPenunjuk - 40))} lebar={lebar} />}
    </div>
  );
}

export function Grafik({ konfig, baris, judul }: { konfig: KonfigGrafik; baris: Array<Record<string, unknown>>; judul: string }) {
  const bungkus = useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = useState(0);

  useEffect(() => {
    const el = bungkus.current;
    if (!el) return;
    const amati = new ResizeObserver(([m]) => setLebar(Math.round(m.contentRect.width)));
    amati.observe(el);
    setLebar(Math.round(el.getBoundingClientRect().width));
    return () => amati.disconnect();
  }, []);

  const data = useMemo(() => {
    try {
      return siapkanGrafik(konfig, baris, judul);
    } catch {
      return null;
    }
  }, [konfig, baris, judul]);

  if (!data || data.label.length === 0 || data.seri.length === 0) return null;
  if (!data.seri.some((s) => s.nilai.some((v) => v != null))) return null;

  const f: FormatSumbu = konfig.y_axis?.format || "number";

  return (
    <figure className="grafik" ref={bungkus}>
      {lebar > 0 &&
        (() => {
          const jenis = pilihJenis(konfig, data, lebar);
          return (
            <>
              {jenis !== "donat" && <Legenda seri={data.seri} />}
              {jenis === "donat" && <Donat d={data} f={f} />}
              {jenis === "datar" && <BatangDatar d={data} k={konfig} f={f} lebar={lebar} />}
              {(jenis === "garis" || jenis === "tegak") && <SumbuTegak d={data} k={konfig} f={f} lebar={lebar} jenis={jenis} />}
            </>
          );
        })()}
      {data.seriTerpotong > 0 && <figcaption>Grafik menampilkan 6 seri pertama. Seri lainnya ada di tabel.</figcaption>}
    </figure>
  );
}
