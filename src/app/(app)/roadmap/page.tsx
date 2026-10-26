import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { fFecha, fFechaHora } from "@/lib/fechas";
import { EST_TAREA } from "@/lib/estados";
import { cambiosPorItem, quien, responsables, type ItemRoadmap, type LogRoadmap } from "@/lib/roadmap";
import { Aviso, Cabecera, Filtros, Insignia, Ocultos, Sel, Tarjeta, Vacio, botonMini, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";
import { FormRoadmap } from "./Formulario";

type R = ItemRoadmap;
const TONO: Record<string, "neutro" | "olive" | "bronze" | "apagado" | "fuerte"> = { pendiente: "neutro", en_curso: "olive", bloqueado: "bronze", finalizado: "fuerte" };
const BARRA: Record<string, string> = { pendiente: "bg-stone", en_curso: "bg-olive", bloqueado: "bg-bronze", finalizado: "bg-olive-deep" };
const SEMANAS = Array.from({ length: 12 }, (_, i) => i + 1);

export default async function Roadmap({ searchParams }: { searchParams: Promise<{ vista?: string; error?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "roadmap")) notFound();
  const { vista = "semanas", error } = await searchParams;
  const editar = puede(s, "roadmap", "editar");
  const supabase = await createClient();
  const [{ data }, { data: altas }, { data: perfiles }] = await Promise.all([
    supabase.from("roadmap_items").select("*").order("semana", { nullsFirst: false }).order("prioridad", { ascending: false }),
    supabase.from("actividad_log").select("entidad_id, creado_en, usuario_id, accion, cambios").eq("entidad_tipo", "roadmap").in("accion", ["insert", "update"]),
    supabase.from("perfiles").select("id, nombre").not("rol_id", "is", null).order("nombre"),
  ]);
  const items = (data ?? []) as R[];
  const nombre = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));
  const titulo = new Map(items.map((i) => [i.id, i.titulo]));
  const hechos = items.filter((i) => i.estado === "finalizado").length;
  const registrado = new Map((altas ?? []).filter((a) => a.accion === "insert").map((a) => [a.entidad_id, a.creado_en as string]));
  const cambios = cambiosPorItem((altas ?? []).filter((a) => a.accion === "update") as LogRoadmap[], nombre);
  const hito = items.find((i) => i.area === "Hito" && i.titulo.startsWith("Inicio operativo"));
  const f = (d: string) => fFecha(d, { day: "2-digit", month: "2-digit", year: "numeric" });
  /** Fechas del trabajo: "22/10/2026" o "del 22/10/2026 al 23/10/2026" */
  const periodo = (i: R) => i.fecha_inicio && i.fecha_limite && i.fecha_inicio !== i.fecha_limite
    ? `del ${f(i.fecha_inicio)} al ${f(i.fecha_limite)}` : i.fecha_limite || i.fecha_inicio ? f((i.fecha_limite || i.fecha_inicio)!) : null;
  const volver = `/roadmap?vista=${vista}`;

  /** Una acción puede ir en varios grupos (responsabilidad compartida) */
  const agrupar = (claves: (i: R) => string[]) => {
    const m = new Map<string, R[]>();
    for (const i of items) for (const c of claves(i)) m.set(c, [...(m.get(c) ?? []), i]);
    return [...m.entries()];
  };
  const grupos = vista === "responsable" ? agrupar((i) => {
      const r = [i.responsable_id, i.corresponsable_id].map((id) => id && nombre.get(id)).filter((x): x is string => !!x);
      return r.length ? r : [i.participantes?.length ? "Sin responsable individual" : "Sin responsable"];
    })
    : vista === "area" ? agrupar((i) => [i.area ?? "Sin área"])
    : SEMANAS.map((w) => [`Semana ${w}`, items.filter((i) => i.semana === w)] as [string, R[]]).concat([["Sin semana", items.filter((i) => !i.semana)]]).filter(([, l]) => l.length);

  const Fila = ({ i }: { i: R }) => (
    <li className="grid items-center gap-2 px-5 py-3 text-sm md:grid-cols-[1fr_9rem_8rem_auto]">
      <div className="min-w-0">
        <Link href={`/roadmap/${i.id}`} className="font-medium hover:text-olive">{i.titulo}</Link>
        <p className="text-xs text-espresso/55">
          {[i.objetivo, i.area, i.semana && `S${i.semana}`, i.fecha_limite && `${i.estado === "finalizado" ? "realizado" : "límite"} ${fFecha(i.fecha_limite, { day: "numeric", month: "short" })}`].filter(Boolean).join(" · ")}
          {i.depende_de_id && <span className="text-bronze"> · depende de «{titulo.get(i.depende_de_id)}»</span>}
        </p>
        {i.resultado_esperado && <p className="mt-0.5 text-xs italic text-espresso/55">→ {i.resultado_esperado}</p>}
      </div>
      <span className="text-xs text-espresso/65">{quien(i, nombre) || "—"}</span>
      {editar ? (
        <form action={guardar} className="flex gap-1">
          <Ocultos v={{ _tabla: "roadmap_items", _id: i.id, _volver: volver }} />
          <Sel name="estado" valor={i.estado} ops={Object.entries(EST_TAREA).map(([id, n]) => ({ id, nombre: n }))} className={`${campo} py-1 text-xs`} />
          <button className={botonMini}>✓</button>
        </form>
      ) : <Insignia tono={TONO[i.estado]}>{EST_TAREA[i.estado]}</Insignia>}
      {editar && <form action={borrar} data-confirmar><Ocultos v={{ _tabla: "roadmap_items", _id: i.id, _volver: volver }} /><button className="text-xs text-espresso/40 hover:text-red-800" title="Quitar">×</button></form>}
    </li>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Desarrollo" titulo="Roadmap · 12 semanas" sub={`${hechos} de ${items.length} acciones finalizadas`}>
        {puede(s, "roadmap", "crear") && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Nueva acción</>} titulo="Nueva acción del roadmap">
            <FormRoadmap perfiles={perfiles ?? []} items={items.map((i) => ({ id: i.id, nombre: i.titulo }))} volver={volver} />
          </Cajon>
        )}
      </Cabecera>
      <Aviso error={error} />

      {hito?.fecha_inicio && (
        <div className="tarjeta aparecer flex flex-wrap items-baseline gap-x-3 gap-y-1 border-olive/40 px-5 py-4">
          <p className="font-serif text-lg">Inicio operativo del proyecto: <b className="font-semibold">{f(hito.fecha_inicio)}</b></p>
        </div>
      )}

      <Filtros base="/roadmap" actual={vista} param="vista" ops={[{ v: "historico", t: "Histórico" }, { v: "semanas", t: "Por semanas" }, { v: "timeline", t: "Timeline" }, { v: "responsable", t: "Por responsable" }, { v: "area", t: "Por área" }]} />

      {!items.length ? <Tarjeta><Vacio>El roadmap está vacío. Añade las acciones de las 12 semanas.</Vacio></Tarjeta> : vista === "historico" ? (
        <div className="space-y-4">
          {[
            { t: "Realizado", l: items.filter((i) => i.estado === "finalizado").sort((a, b) => (a.fecha_limite ?? a.fecha_inicio ?? "").localeCompare(b.fecha_limite ?? b.fecha_inicio ?? "") || (a.area === "Hito" ? -1 : 1)), tono: "text-olive-deep" },
            { t: "En curso", l: items.filter((i) => i.estado === "en_curso" || i.estado === "bloqueado"), tono: "text-bronze" },
            { t: "Próximos pasos", l: items.filter((i) => i.estado === "pendiente"), tono: "text-espresso/70" },
          ].map((g) => (
            <Tarjeta key={g.t} titulo={<span className={g.tono}>{g.t} <span className="text-sm text-espresso/45">{g.l.length}</span></span>} sinPadding>
              {g.l.length ? (
                <ul className="divide-y divide-stone/40">
                  {g.l.map((i) => (
                    <li key={i.id} className={`px-5 py-3 text-sm ${i.area === "Hito" ? "bg-olive/5" : ""}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/roadmap/${i.id}`} className={`hover:text-olive ${i.area === "Hito" ? "font-serif text-base font-semibold" : "font-medium"}`}>{i.area === "Hito" && "◆ "}{i.titulo}</Link>
                        <p className="text-xs text-espresso/65">
                          {i.estado === "finalizado" ? (periodo(i) ? `Realizado ${periodo(i)}` : "Realizado") : periodo(i) ?? ""}
                          {i.estado === "bloqueado" && <Insignia tono="bronze">bloqueado</Insignia>}
                        </p>
                      </div>
                      <p className="text-xs text-espresso/55">
                        {quien(i, nombre)}
                        {i.comentarios && <> · {i.comentarios}</>}
                      </p>
                      {cambios.get(i.id)?.slice(0, 3).map((c, n) => (
                        <p key={n} className="text-[11px] text-espresso/45">{fFechaHora(c.fecha)} · {c.quien}: {c.textos.join(" · ")}</p>
                      ))}
                      {registrado.get(i.id) && <p className="text-[11px] text-espresso/40">Registrado en la app el {f(registrado.get(i.id)!)}</p>}
                    </li>
                  ))}
                </ul>
              ) : <Vacio>Nada por aquí.</Vacio>}
            </Tarjeta>
          ))}
        </div>
      ) : vista === "timeline" ? (
        <Tarjeta sinPadding>
          <div className="overflow-x-auto">
            <div className="min-w-[56rem]">
              <div className="grid grid-cols-[16rem_repeat(12,1fr)] border-b border-stone/60 text-[10px] uppercase tracking-[0.12em] text-espresso/50">
                <div className="px-4 py-2">Acción</div>
                {SEMANAS.map((w) => <div key={w} className="border-l border-stone/40 py-2 text-center">S{w}</div>)}
              </div>
              {items.map((i) => {
                const ini = i.semana ?? 1;
                const dur = i.fecha_inicio && i.fecha_limite ? Math.max(1, Math.ceil((new Date(i.fecha_limite).getTime() - new Date(i.fecha_inicio).getTime()) / (7 * 864e5))) : 1;
                return (
                  <div key={i.id} className="grid grid-cols-[16rem_repeat(12,1fr)] items-center border-b border-stone/30 text-sm">
                    <div className="truncate px-4 py-2" title={i.titulo}>{i.titulo}<span className="block text-[11px] text-espresso/50">{responsables(i, nombre)}</span></div>
                    <div className="relative col-span-12 grid h-full grid-cols-12">
                      {SEMANAS.map((w) => <div key={w} className="border-l border-stone/30" />)}
                      {i.semana && (
                        <div className={`absolute top-1/2 h-5 -translate-y-1/2 rounded-full ${BARRA[i.estado]} ${i.depende_de_id ? "ring-2 ring-bronze/40" : ""}`}
                          style={{ left: `calc(${((ini - 1) / 12) * 100}% + 4px)`, width: `calc(${(Math.min(dur, 13 - ini) / 12) * 100}% - 8px)` }} title={EST_TAREA[i.estado]} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 px-4 py-3 text-[11px] text-espresso/60">
            {Object.entries(EST_TAREA).map(([k, t]) => <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-4 rounded-full ${BARRA[k]}`} />{t}</span>)}
            <span>Borde bronce = tiene dependencia</span>
          </div>
        </Tarjeta>
      ) : grupos.map(([g, l]) => (
        <Tarjeta key={g} titulo={<>{g} <span className="text-sm text-espresso/45">{l.filter((i) => i.estado === "finalizado").length}/{l.length}</span></>} sinPadding>
          <ul className="divide-y divide-stone/40">{l.map((i) => <Fila key={i.id} i={i} />)}</ul>
        </Tarjeta>
      ))}
    </div>
  );
}
