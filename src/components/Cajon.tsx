"use client";

import { useState } from "react";

/** Botón que abre un panel lateral. Se cierra solo al enviar cualquier formulario de dentro. */
export function Cajon({ boton, titulo, children, variante = "primario" }: {
  boton: React.ReactNode; titulo: string; children: React.ReactNode; variante?: "primario" | "secundario" | "enlace";
}) {
  const [abierto, setAbierto] = useState(false);
  const cls = {
    primario: "inline-flex items-center gap-1.5 rounded-lg bg-olive px-4 py-2 text-sm text-cream shadow-md shadow-olive/25 hover:bg-olive-deep transition",
    secundario: "inline-flex items-center gap-1.5 rounded-lg border border-stone bg-cream/70 px-4 py-2 text-sm hover:border-olive transition",
    enlace: "text-xs text-olive hover:text-bronze",
  }[variante];
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={cls}>{boton}</button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-espresso/30 backdrop-blur-sm" onClick={() => setAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} onSubmit={() => setTimeout(() => setAbierto(false), 350)}
            className="aparecer h-full w-full max-w-lg overflow-y-auto bg-cream p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-2xl">{titulo}</h2>
              <button type="button" onClick={() => setAbierto(false)} className="text-2xl leading-none text-espresso/50 hover:text-espresso">×</button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
