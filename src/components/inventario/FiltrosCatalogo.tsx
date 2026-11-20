"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Op = { v: string; t: string };
const sel = "rounded-full border border-stone/70 bg-cream/70 px-3.5 py-2 text-sm outline-none transition hover:border-bronze/60 focus:border-olive";

/** Buscador + filtros que se aplican al momento (sin botón) y se reflejan en la URL */
export function FiltrosCatalogo({ estados, disponibilidad, ubicaciones, rangos }: { estados: Op[]; disponibilidad: Op[]; ubicaciones: string[]; rangos: Op[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [cargando, iniciar] = useTransition();
  const primera = useRef(true);

  const poner = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v); else p.delete(k);
    iniciar(() => router.replace(`/inventario/catalogo?${p.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => poner("q", q.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activos = ["estado", "disp", "ubic", "cant", "pend"].filter((k) => sp.get(k)).length;

  return (
    <div className={`flex flex-col gap-3 transition-opacity lg:flex-row lg:items-center ${cargando ? "opacity-60" : ""}`}>
      <label className="relative flex-1 lg:max-w-sm">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o código…" aria-label="Buscar"
          className="w-full rounded-full border border-stone/70 bg-cream/80 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-olive focus:bg-cream" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Estado" value={sp.get("estado") ?? ""} onChange={(e) => poner("estado", e.target.value)} className={sel}>
          <option value="">Estado</option>{estados.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
        </select>
        <select aria-label="Disponibilidad" value={sp.get("disp") ?? ""} onChange={(e) => poner("disp", e.target.value)} className={sel}>
          <option value="">Disponibilidad</option>{disponibilidad.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
        </select>
        <select aria-label="Ubicación" value={sp.get("ubic") ?? ""} onChange={(e) => poner("ubic", e.target.value)} className={sel}>
          <option value="">Ubicación</option>
          <option value="__sin">Sin asignar</option>
          {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select aria-label="Cantidad" value={sp.get("cant") ?? ""} onChange={(e) => poner("cant", e.target.value)} className={sel}>
          <option value="">Cantidad</option>{rangos.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
        </select>
        <button type="button" onClick={() => poner("pend", sp.get("pend") ? "" : "1")}
          className={`rounded-full border px-3.5 py-2 text-sm transition ${sp.get("pend") ? "border-dashed border-bronze bg-bronze/15 text-bronze" : "border-stone/70 bg-cream/70 hover:border-bronze/60"}`}>
          Pendientes de confirmar
        </button>
        {(activos > 0 || q) && (
          <button type="button" onClick={() => { setQ(""); const p = new URLSearchParams(); if (sp.get("cat")) p.set("cat", sp.get("cat")!); if (sp.get("vista")) p.set("vista", sp.get("vista")!); iniciar(() => router.replace(`/inventario/catalogo?${p}`, { scroll: false })); }}
            className="px-2 text-xs text-olive underline-offset-4 hover:underline">Quitar filtros</button>
        )}
      </div>
    </div>
  );
}
