import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { moverLead } from "./actions";
import { NuevoLead } from "./NuevoLead";
import { fFecha, hoyMadrid } from "@/lib/fechas";
import { Filtros } from "@/components/ui";

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const PRIORIDAD: Record<string, string> = {
  baja: "bg-stone/60", media: "bg-sand", alta: "bg-bronze/30", urgente: "bg-bronze text-cream",
};

export default async function Leads({ searchParams }: { searchParams: Promise<{ nuevo?: string; f?: string }> }) {
  const { nuevo, f = "" } = await searchParams;
  const hoy = hoyMadrid();
  const hace2 = new Date(new Date(`${hoy}T12:00:00Z`).getTime() - 2 * 864e5).toISOString().slice(0, 10);
  const s = await getSesion();
  if (!puede(s, "leads")) notFound();
  const supabase = await createClient();
  const editar = puede(s, "leads", "editar");
  const importes = puede(s, "leads", "ver_importes");

  const [{ data: estados }, { data: leads }, { data: categorias }, { data: campanas }, { data: perfiles }] = await Promise.all([
    supabase.from("estados_lead").select("id, nombre, orden, es_ganado, es_perdido").order("orden"),
    supabase.from("leads")
      .select("id, codigo, titulo, fecha_prevista, asistentes, presupuesto_estimado, prioridad, proxima_accion, fecha_proxima_accion, fecha_entrada, estado_id, clientes(nombre), perfiles!leads_responsable_id_fkey(nombre)")
      .order("actualizado_en", { ascending: false }),
    supabase.from("categorias").select("id, nombre, padre_id").not("padre_id", "is", null).order("orden"),
    supabase.from("campanas").select("id, nombre").eq("activa", true),
    supabase.from("perfiles").select("id, nombre, roles(clave)"),
  ]);

  // Seguimiento: la próxima acción es obligatoria en leads activos (salvo "Nuevo" con menos de 2 días)
  const cerrado = new Set((estados ?? []).filter((e) => e.es_ganado || e.es_perdido).map((e) => e.id));
  const nuevoId = (estados ?? []).find((e) => e.nombre === "Nuevo")?.id;
  type L = NonNullable<typeof leads>[number];
  const seguimiento = (l: L) => {
    if (cerrado.has(l.estado_id)) return "cerrado";
    if (!l.proxima_accion) return l.estado_id === nuevoId && l.fecha_entrada >= hace2 ? "reciente" : "sin_accion";
    if (l.fecha_proxima_accion && l.fecha_proxima_accion < hoy) return "vencida";
    if (l.fecha_proxima_accion === hoy) return "hoy";
    return "ok";
  };
  const todos = leads ?? [];
  const cuenta = (k: string) => todos.filter((l) => seguimiento(l) === k).length;
  const visibles = f ? todos.filter((l) => seguimiento(l) === f || (f === "vencidas" && seguimiento(l) === "vencida")) : todos;

  const responsables = (perfiles ?? [])
    .filter((p) => (p.roles as unknown as { clave: string } | null)?.clave === "admin_tge")
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="space-y-6">
      <header className="aparecer flex flex-wrap gap-3 justify-between items-end">
        <div>
          <p className="antetitulo">CRM · Pipeline</p>
          <h1 className="font-serif text-4xl mt-1">Leads</h1>
          <p className="text-sm text-espresso/60 mt-1">{todos.length} oportunidades</p>
        </div>
        {puede(s, "leads", "crear") && (
          <NuevoLead key={nuevo ?? "-"} abrir={nuevo === "1"} estados={estados ?? []} categorias={categorias ?? []} campanas={campanas ?? []} responsables={responsables} />
        )}
      </header>

      <Filtros base="/leads" actual={f} ops={[
        { v: "", t: "Todos", n: todos.length },
        { v: "vencidas", t: "Acción vencida", n: cuenta("vencida") },
        { v: "hoy", t: "Para hoy", n: cuenta("hoy") },
        { v: "sin_accion", t: "Sin próxima acción", n: cuenta("sin_accion") },
      ]} />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {(estados ?? []).map((e) => {
          const col = visibles.filter((l) => l.estado_id === e.id);
          const total = col.reduce((t, l) => t + Number(l.presupuesto_estimado ?? 0), 0);
          return (
            <section key={e.id} className="aparecer w-72 shrink-0 rounded-2xl bg-stone/25 border border-stone/40 p-3 space-y-2" style={{ animationDelay: `${(e.orden ?? 0) * 40}ms` }}>
              <div className="flex justify-between text-xs font-medium px-1">
                <span>{e.nombre}</span>
                <span className="text-espresso/60">{col.length}{importes && total > 0 ? ` · ${eur(total)}` : ""}</span>
              </div>
              {col.map((l) => {
                const cliente = l.clientes as unknown as { nombre: string } | null;
                const resp = l.perfiles as unknown as { nombre: string } | null;
                return (
                  <article key={l.id} className="tarjeta tarjeta-viva p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-[10px] text-espresso/50">{l.codigo}</span>
                      <span className={`text-[10px] rounded-full px-2 ${PRIORIDAD[l.prioridad]}`}>{l.prioridad}</span>
                    </div>
                    <Link href={`/leads/${l.id}`} className="block font-medium leading-snug hover:text-olive">{l.titulo}</Link>
                    {cliente && <p className="text-xs text-espresso/70">{cliente.nombre}</p>}
                    <p className="text-xs text-espresso/60">
                      {[l.fecha_prevista, l.asistentes && `${l.asistentes} pax`, importes && l.presupuesto_estimado && eur(Number(l.presupuesto_estimado))]
                        .filter(Boolean).join(" · ")}
                    </p>
                    <Seguimiento estado={seguimiento(l)} accion={l.proxima_accion} fecha={l.fecha_proxima_accion} />
                    {resp && <p className="text-[11px] text-olive">{resp.nombre}</p>}
                    {editar && (
                      <form action={moverLead} className="pt-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select name="estado_id" defaultValue={l.estado_id}
                          className="w-full rounded border border-stone bg-sand/40 text-xs px-1 py-1">
                          {(estados ?? []).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                        </select>
                        <button className="mt-1 text-[11px] text-olive hover:underline">Mover</button>
                      </form>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Seguimiento({ estado, accion, fecha }: { estado: string; accion: string | null; fecha: string | null }) {
  if (estado === "cerrado" || estado === "reciente") return accion ? <p className="text-xs">→ {accion}</p> : null;
  if (estado === "sin_accion") return <p className="rounded-md bg-bronze/15 px-2 py-1 text-[11px] text-bronze">⚠ Sin próxima acción</p>;
  const f = fecha ? fFecha(fecha, { day: "numeric", month: "short" }) : "sin fecha";
  const cls = estado === "vencida" ? "bg-bronze/15 text-bronze" : estado === "hoy" ? "bg-olive/15 text-olive-deep" : "text-espresso/75";
  return <p className={`rounded-md px-2 py-1 text-[11px] ${cls}`}>→ {accion} · <b className="font-medium">{estado === "vencida" ? `vencida (${f})` : estado === "hoy" ? "hoy" : f}</b></p>;
}
