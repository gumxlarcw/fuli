import type { Metadata } from "next";
import "@fontsource-variable/piazzolla/wght-italic.css";
import "@/components/beranda/beranda.css";
import { BerandaHidup } from "@/components/beranda/BerandaHidup";
import { MARKUP } from "@/components/beranda/markup";

export const metadata: Metadata = {
  title: "Fuli: kenali Maluku Utara lewat data",
};

// Halaman muka. Isinya HTML statis (markup.ts) agar bisa dibaca tanpa JavaScript;
// kotak tanya membawa pertanyaan ke /tanya, panggung 3D dimuat sesudahnya.
export default function Beranda() {
  return (
    <>
      <div className="beranda" dangerouslySetInnerHTML={{ __html: MARKUP }} />
      <BerandaHidup />
    </>
  );
}
