import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { moverLead } from "./actions";
import { NuevoLead } from "./NuevoLead";

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const PRIORIDAD: Record<string, string> = {
  baja: "bg-stone/60", media: "bg-sand", alta: "bg-bronze/30", urgente: "bg-bronze text-cream",
};

export default async function Leads({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "leads")) notFound();
  const supabase = await createClient();
  const editar = puede(s, "leads", "editar");
  const importes = puede(s, "leads", "ver_importes");

  const [{ data: estados }, { data: leads }, { data: categorias }, { data: campanas }, { data: perfiles }] = await Promise.all([
    supabase.from("estados_lead").select("id, nombre, orden").order("orden"),
    supabase.from("leads")
      .select("id, codigo, titulo, fecha_prevista, asistentes, presupuesto_estimado, prioridad, proxima_accion, estado_id, clientes(nombre), perfiles!leads_responsable_id_fkey(nombre)")
      .order("actualizado_en", { ascending: false }),
    supabase.from("categorias").select("id, nombre, padre_id").not("padre_id", "is", null).order("orden"),
    supabase.from("campanas").select("id, nombre").eq("activa", true),
    supabase.from("perfiles").select("id, nombre, roles(clave)"),
  ]);

  const responsables = (perfiles ?? [])
    .filter((p) => (p.roles as unknown as { clave: string } | null)?.clave === "admin_tge")
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="space-y-6">
      <header className="aparecer flex flex-wrap gap-3 justify-between items-end">
        <div>
          <p className="antetitulo">CRM · Pipeline</p>
          <h1 className="font-serif text-4xl mt-1">Leads</h1>
          <p className="text-sm text-espresso/60 mt-1">{leads?.length ?? 0} oportunidades</p>
        </div>
        {puede(s, "leads", "crear") && (
          <NuevoLead key={nuevo ?? "-"} abrir={nuevo === "1"} estados={estados ?? []} categorias={categorias ?? []} campanas={campanas ?? []} responsables={responsables} />
        )}
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {(estados ?? []).map((e) => {
          const col = (leads ?? []).filter((l) => l.estado_id === e.id);
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
                    {l.proxima_accion && <p className="text-xs">→ {l.proxima_accion}</p>}
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
