import type { Metadata, Viewport } from "next";
import "@fontsource-variable/piazzolla/index.css";
import "@fontsource-variable/source-sans-3/index.css";
import "@/styles/tokens.css";
// globals.css (ruang tanya) dimuat oleh /tanya; halaman muka memakai beranda.css sendiri.

export const metadata: Metadata = {
  metadataBase: new URL("https://fuli.bpsmalut.com"),
  title: "Fuli: tanya angka Maluku Utara",
  description: "Fuli (Fakta, Uraian, dan Literasi Indikator) menjawab pertanyaan data BPS Provinsi Maluku Utara dan menjelaskan artinya dengan bahasa sehari-hari.",
  applicationName: "Fuli",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/ikon-192.png" },
  openGraph: {
    title: "Fuli: tanya angka Maluku Utara",
    description: "Tanya data BPS Provinsi Maluku Utara. Fuli mencari angkanya dan menjelaskan artinya.",
    url: "https://fuli.bpsmalut.com",
    siteName: "Fuli",
    locale: "id_ID",
    images: [{ url: "/ikon-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDEFD2" },
    { media: "(prefers-color-scheme: dark)", color: "#1F0D10" },
  ],
};

// Dijalankan sebelum gambar pertama supaya tema pilihan tidak berkedip.
const SKRIP_TEMA = `try{var t=localStorage.getItem("fuli_tema");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function TataLetak({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
