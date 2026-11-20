"use client";

import { useEffect } from "react";

/** Barra (no se imprime) y apertura automática del diálogo de impresión / guardar como PDF */
export function Imprimir({ volver }: { volver: string }) {
  useEffect(() => {
    const imgs = [...document.images];
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; })))).then(() => setTimeout(() => window.print(), 300));
  }, []);
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 bg-[#2e2a26] px-6 py-3 text-sm text-[#ede4d8]">
      <a href={volver} className="opacity-80 hover:opacity-100">← Volver</a>
      <span className="hidden opacity-70 sm:block">En el diálogo, elige «Guardar como PDF» y activa «Gráficos de fondo».</span>
      <button onClick={() => window.print()} className="rounded-full bg-[#ede4d8] px-4 py-1.5 text-[#2e2a26]">Descargar PDF</button>
    </div>
  );
}
