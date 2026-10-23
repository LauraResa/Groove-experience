"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { analizarFechas, importarFechas, type FilaAnalizada } from "./actions";

const TIPOS = [
  { id: "sesion_groove", nombre: "Sesión Groove" }, { id: "otro", nombre: "Evento / otro" }, { id: "bloqueo", nombre: "Bloqueo" },
  { id: "no_disponible", nombre: "No disponible" }, { id: "montaje", nombre: "Montaje" }, { id: "desmontaje", nombre: "Desmontaje" },
];
const campo = "w-full rounded-lg border border-stone bg-cream/80 px-2.5 py-1.5 text-sm outline-none focus:border-olive";
const EJEMPLO = `18/10/2026 22:00-06:00 Sesión Groove
24 de octubre Boda privada ?
sáb 31 oct Halloween (posible)
12/12 de 13:00 a 18:00 Cena empresa ACME por confirmar`;

type Fila = FilaAnalizada & { incluir: boolean; tipo: string };
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function ImportarFechas() {
  const [abierto, setAbierto] = useState(false);
  const [tipoDefecto, setTipoDefecto] = useState("sesion_groove");
  const [analisis, analizar, analizando] = useActionState(analizarFechas, null);
  const [res, importar, importando] = useActionState(importarFechas, null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const router = useRouter();

  useEffect(() => {
    setFilas((analisis?.filas ?? []).map((r) => ({ ...r, incluir: !r.error && !r.duplicado, tipo: tipoDefecto })));
    // tipoDefecto se aplica en el momento de analizar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisis]);
  useEffect(() => { if (res?.startsWith("ok:")) router.refresh(); }, [res, router]);

  const cambiar = (i: number, c: Partial<Fila>) => setFilas((fs) => fs.map((x, j) => (j === i ? { ...x, ...c } : x)));
  const marcadas = filas.filter((r) => r.incluir && r.inicio && r.fin);
  const cuenta = {
    confirmadas: marcadas.filter((r) => !r.posible).length,
    posibles: marcadas.filter((r) => r.posible).length,
    solapes: filas.filter((r) => r.solapes.length).length,
    errores: filas.filter((r) => r.error).length,
  };
  const hecho = res?.startsWith("ok:");

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone bg-cream/70 px-4 py-2 text-sm hover:border-olive transition">
        Importar fechas
      </button>
      {abierto && createPortal(
        <div><div className="fixed inset-0 z-50 flex justify-end bg-espresso/30 backdrop-blur-sm" onClick={() => setAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="aparecer h-full w-full max-w-5xl overflow-y-auto bg-cream p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Importar fechas al calendario</h2>
              <button type="button" onClick={() => setAbierto(false)} className="text-2xl leading-none text-espresso/50 hover:text-espresso">×</button>
            </div>

            {hecho ? (
              <div className="tarjeta p-6 text-center space-y-3">
                <p className="font-serif text-2xl">✓ {res!.slice(3)} fechas importadas</p>
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg bg-olive px-4 py-2 text-sm text-cream">Ver calendario</button>
              </div>
            ) : (
              <>
                <form action={analizar} className="space-y-3">
                  <p className="text-sm text-espresso/70">Pega una fecha por línea (desde Excel, un documento o WhatsApp). La app interpreta fecha, horario y título, y marca como <b>posible</b> lo que lleve «?», «posible», «provisional», «por confirmar», «pendiente» o «TBC». No se guarda nada hasta que pulses <b>Importar</b>.</p>
                  <textarea name="texto" rows={8} required placeholder={EJEMPLO} className={`${campo} font-mono text-xs`} />
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="space-y-1"><span className="text-xs text-espresso/60">Tipo por defecto</span>
                      <select value={tipoDefecto} onChange={(e) => setTipoDefecto(e.target.value)} className={campo}>
                        {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select></label>
                    <label className="space-y-1"><span className="text-xs text-espresso/60">Año si no se indica</span>
                      <input name="anio" type="number" defaultValue={new Date().getFullYear()} className={`${campo} w-24`} /></label>
                    <button disabled={analizando} className="rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep disabled:opacity-60">{analizando ? "Analizando…" : "Analizar"}</button>
                  </div>
                  {analisis?.error && <p className="text-sm text-red-800">{analisis.error}</p>}
                </form>

                {filas.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-olive/15 px-2.5 py-1 text-olive-deep">{cuenta.confirmadas} confirmadas</span>
                      <span className="rounded-full border border-dashed border-olive px-2.5 py-1 text-olive-deep">{cuenta.posibles} posibles</span>
                      {cuenta.solapes > 0 && <span className="rounded-full bg-bronze/20 px-2.5 py-1 text-bronze">⚠ {cuenta.solapes} con solape</span>}
                      {cuenta.errores > 0 && <span className="rounded-full bg-red-800/10 px-2.5 py-1 text-red-800">{cuenta.errores} sin entender</span>}
                    </div>
                    <div className="tarjeta overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-[10px] uppercase tracking-[0.12em] text-espresso/50">
                          <th className="px-3 py-2">Incluir</th><th className="px-3 py-2">Fecha y horario</th><th className="px-3 py-2">Título</th>
                          <th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Posible</th><th className="px-3 py-2">Avisos</th>
                        </tr></thead>
                        <tbody>
                          {filas.map((r, i) => (
                            <tr key={i} className={`border-t border-stone/40 align-top ${r.error ? "bg-red-800/5" : r.posible ? "bg-olive/5" : ""} ${r.incluir ? "" : "opacity-55"}`}>
                              <td className="px-3 py-2"><input type="checkbox" checked={r.incluir} disabled={!!r.error} onChange={(e) => cambiar(i, { incluir: e.target.checked })} className="accent-olive" /></td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {r.inicio && r.fin ? <>
                                  <p className="font-medium">{fecha(r.inicio)}</p>
                                  <p className="text-xs text-espresso/60">{r.todoElDia ? "Todo el día" : `${hora(r.inicio)} – ${hora(r.fin)}`}</p>
                                </> : <p className="text-xs text-espresso/50">línea {r.linea}</p>}
                              </td>
                              <td className="px-3 py-2">
                                {r.error ? <p className="text-xs text-espresso/60">{r.original}</p>
                                  : <input value={r.titulo} onChange={(e) => cambiar(i, { titulo: e.target.value })} className={`${campo} py-1`} />}
                              </td>
                              <td className="px-3 py-2">
                                {!r.error && <select value={r.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value })} className={`${campo} py-1 text-xs`}>
                                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>}
                              </td>
                              <td className="px-3 py-2">{!r.error && <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={r.posible} onChange={(e) => cambiar(i, { posible: e.target.checked })} className="accent-olive" />{r.posible ? "Posible" : "—"}</label>}</td>
                              <td className="px-3 py-2 text-xs space-y-0.5">
                                {r.error && <p className="text-red-800">{r.error}</p>}
                                {r.duplicado && <p className="text-bronze">Ya existe en el calendario</p>}
                                {r.solapes.length > 0 && <p className="text-bronze">⚠ Coincide con: {r.solapes.slice(0, 3).join(", ")}{r.solapes.length > 3 ? "…" : ""}</p>}
                                {r.avisos.map((a) => <p key={a} className="text-espresso/55">{a}</p>)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <form action={importar} className="flex flex-wrap items-center justify-end gap-3">
                      <input type="hidden" name="filas" value={JSON.stringify(marcadas.map((r) => ({ titulo: r.titulo, inicio: r.inicio, fin: r.fin, tipo: r.tipo, posible: r.posible })))} />
                      {res && !hecho && <p className="text-sm text-red-800">{res}</p>}
                      <button disabled={importando || !marcadas.length} className="rounded-lg bg-olive px-5 py-2 text-sm text-cream hover:bg-olive-deep disabled:opacity-60">
                        {importando ? "Importando…" : `Importar ${marcadas.length} fechas`}
                      </button>
                    </form>
                  </section>
                )}
              </>
            )}
          </div>
        </div></div>,
        document.body,
      )}
    </>
  );
}
