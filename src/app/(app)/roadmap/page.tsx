import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { fFecha } from "@/lib/fechas";
import { EST_TAREA, PRIORIDADES } from "@/lib/estados";
import { Cabecera, Campo, Filtros, Insignia, Ocultos, Sel, Tarjeta, Vacio, boton, botonMini, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

type R = { id: string; semana: number | null; area: string | null; objetivo: string | null; titulo: string; responsable_id: string | null; colaborador_id: string | null; depende_de_id: string | null; fecha_inicio: string | null; fecha_limite: string | null; estado: string; prioridad: string; resultado_esperado: string | null; comentarios: string | null };
const TONO: Record<string, "neutro" | "olive" | "bronze" | "apagado" | "fuerte"> = { pendiente: "neutro", en_curso: "olive", bloqueado: "bronze", finalizado: "fuerte" };
const BARRA: Record<string, string> = { pendiente: "bg-stone", en_curso: "bg-olive", bloqueado: "bg-bronze", finalizado: "bg-olive-deep" };
const SEMANAS = Array.from({ length: 12 }, (_, i) => i + 1);

export default async function Roadmap({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "roadmap")) notFound();
  const { vista = "semanas" } = await searchParams;
  const editar = puede(s, "roadmap", "editar");
  const supabase = await createClient();
  const [{ data }, { data: altas }, { data: perfiles }] = await Promise.all([
    supabase.from("roadmap_items").select("*").order("semana", { nullsFirst: false }).order("prioridad", { ascending: false }),
    supabase.from("actividad_log").select("entidad_id, creado_en").eq("entidad_tipo", "roadmap").eq("accion", "insert"),
    supabase.from("perfiles").select("id, nombre").not("rol_id", "is", null),
  ]);
  const items = (data ?? []) as R[];
  const nombre = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));
  const titulo = new Map(items.map((i) => [i.id, i.titulo]));
  const hechos = items.filter((i) => i.estado === "finalizado").length;
  const registrado = new Map((altas ?? []).map((a) => [a.entidad_id, a.creado_en as string]));
  const hito = items.find((i) => i.area === "Hito" && i.titulo.startsWith("Inicio operativo"));
  const f = (d: string) => fFecha(d, { day: "2-digit", month: "2-digit", year: "numeric" });
  /** Fechas del trabajo: "22/10/2026" o "del 22/10/2026 al 23/10/2026" */
  const periodo = (i: R) => i.fecha_inicio && i.fecha_limite && i.fecha_inicio !== i.fecha_limite
    ? `del ${f(i.fecha_inicio)} al ${f(i.fecha_limite)}` : i.fecha_limite || i.fecha_inicio ? f((i.fecha_limite || i.fecha_inicio)!) : null;
  const volver = `/roadmap?vista=${vista}`;

  const agrupar = (clave: (i: R) => string) => {
    const m = new Map<string, R[]>();
    for (const i of items) m.set(clave(i), [...(m.get(clave(i)) ?? []), i]);
    return [...m.entries()];
  };
  const grupos = vista === "responsable" ? agrupar((i) => nombre.get(i.responsable_id ?? "") ?? "Sin responsable")
    : vista === "area" ? agrupar((i) => i.area ?? "Sin área")
    : SEMANAS.map((w) => [`Semana ${w}`, items.filter((i) => i.semana === w)] as [string, R[]]).concat([["Sin semana", items.filter((i) => !i.semana)]]).filter(([, l]) => l.length);

  const Fila = ({ i }: { i: R }) => (
    <li className="grid items-center gap-2 px-5 py-3 text-sm md:grid-cols-[1fr_9rem_8rem_auto]">
      <div className="min-w-0">
        <p className="font-medium">{i.titulo}</p>
        <p className="text-xs text-espresso/55">
          {[i.objetivo, i.area, i.semana && `S${i.semana}`, i.fecha_limite && `${i.estado === "finalizado" ? "realizado" : "límite"} ${fFecha(i.fecha_limite, { day: "numeric", month: "short" })}`].filter(Boolean).join(" · ")}
          {i.depende_de_id && <span className="text-bronze"> · depende de «{titulo.get(i.depende_de_id)}»</span>}
        </p>
        {i.resultado_esperado && <p className="mt-0.5 text-xs italic text-espresso/55">→ {i.resultado_esperado}</p>}
      </div>
      <span className="text-xs text-espresso/65">{nombre.get(i.responsable_id ?? "") ?? "—"}{i.colaborador_id && ` + ${nombre.get(i.colaborador_id)}`}</span>
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
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "roadmap_items", _volver: volver }} />
              <Campo t="Tarea"><input name="titulo" required className={campo} /></Campo>
              <Campo t="Objetivo"><input name="objetivo" className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Semana (1-12)"><input name="semana" type="number" min="1" max="12" className={campo} /></Campo>
                <Campo t="Área"><input name="area" list="areas" className={campo} placeholder="Comercial, Operativa…" /></Campo>
                <Campo t="Responsable"><Sel name="responsable_id" ops={perfiles ?? []} vacio="—" /></Campo>
                <Campo t="Colaborador"><Sel name="colaborador_id" ops={perfiles ?? []} vacio="—" /></Campo>
                <Campo t="Inicio"><input name="fecha_inicio" type="date" className={campo} /></Campo>
                <Campo t="Fecha límite"><input name="fecha_limite" type="date" className={campo} /></Campo>
                <Campo t="Prioridad"><Sel name="prioridad" valor="media" ops={PRIORIDADES} /></Campo>
                <Campo t="Depende de"><Sel name="depende_de_id" ops={items.map((i) => ({ id: i.id, nombre: i.titulo }))} vacio="—" /></Campo>
              </div>
              <Campo t="Resultado esperado"><input name="resultado_esperado" className={campo} /></Campo>
              <datalist id="areas">{["Comercial", "Operativa", "Comunicación", "Producto", "Alianzas", "Finanzas"].map((a) => <option key={a} value={a} />)}</datalist>
              <button className={`${boton} w-full`}>Añadir</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

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
                        <p className={i.area === "Hito" ? "font-serif text-base font-semibold" : "font-medium"}>{i.area === "Hito" && "◆ "}{i.titulo}</p>
                        <p className="text-xs text-espresso/65">
                          {i.estado === "finalizado" ? (periodo(i) ? `Realizado ${periodo(i)}` : "Realizado") : periodo(i) ?? ""}
                          {i.estado === "bloqueado" && <Insignia tono="bronze">bloqueado</Insignia>}
                        </p>
                      </div>
                      <p className="text-xs text-espresso/55">
                        {[nombre.get(i.responsable_id ?? ""), i.colaborador_id && nombre.get(i.colaborador_id)].filter(Boolean).join(" y ")}
                        {i.comentarios && <> · {i.comentarios}</>}
                      </p>
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
                    <div className="truncate px-4 py-2" title={i.titulo}>{i.titulo}<span className="block text-[11px] text-espresso/50">{nombre.get(i.responsable_id ?? "") ?? ""}</span></div>
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
