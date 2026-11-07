"use client";

import { useEffect } from "react";
import { hidupkanBeranda } from "./hidupkan";

/**
 * Menghidupkan halaman muka sesudah hidrasi: mesin ketik dan kotak tanya lebih dulu,
 * lalu panggung 3D dimuat terpisah supaya three.js tidak menahan teks halaman.
 * Bila modul 3D gagal dimuat, tanda statis (.cadangan) tetap tampil.
 */
export function BerandaHidup() {
  useEffect(() => {
    hidupkanBeranda();
    import("./adeganBeranda")
      .then((m) => m.mulaiAdegan())
      .catch((galat) => {
        document.documentElement.classList.add("tanpa-3d");
        console.warn("Panggung 3D Fuli tidak dimuat, tanda statis dipakai.", galat);
      });
  }, []);
  return null;
}
