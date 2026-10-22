import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { eur, fFecha } from "@/lib/fechas";
import { EST_PROPUESTA } from "@/lib/estados";
import { Cabecera, Filtros, Insignia, Kpi, Tarjeta, Vacio } from "@/components/ui";

const GRUPOS: Record<string, string[]> = {
  abiertas: ["borrador", "pendiente_aprobacion", "aprobada", "enviada", "negociacion"],
  aprobacion: ["pendiente_aprobacion"],
  aceptadas: ["aceptada"],
  cerradas: ["rechazada", "caducada"],
};

export default async function Propuestas({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "propuestas")) notFound();
  const { f = "abiertas" } = await searchParams;
  const importes = puede(s, "propuestas", "ver_importes");
  const supabase = await createClient();

  const [{ data: props }, { data: totales }] = await Promise.all([
    supabase.from("propuestas").select("id, codigo, version, titulo, estado, fecha_evento, asistentes, fecha_envio, requiere_aprobacion, lead_id, leads(clientes(nombre)), perfiles(nombre)").order("creado_en", { ascending: false }),
    supabase.from("propuesta_totales").select("propuesta_id, total, margen"),
  ]);
  const tot = new Map((totales ?? []).map((t) => [t.propuesta_id, t]));
  const todas = props ?? [];
  const lista = f === "todas" ? todas : todas.filter((p) => (GRUPOS[f] ?? []).includes(p.estado));
  const suma = (est: string[]) => todas.filter((p) => est.includes(p.estado)).reduce((a, p) => a + Number(tot.get(p.id)?.total ?? 0), 0);
  const cuenta = (k: string) => todas.filter((p) => (GRUPOS[k] ?? []).includes(p.estado)).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Comercial" titulo="Propuestas" sub="Las propuestas se crean desde la ficha de cada lead." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi destacado icono="propuestas" label="Abiertas" valor={cuenta("abiertas")} sub={importes ? eur(suma(GRUPOS.abiertas)) : undefined} />
        <Kpi icono="alerta" label="Pendientes de aprobación" valor={cuenta("aprobacion")} sub="Fuera de condiciones estándar" />
        <Kpi icono="eventos" label="Aceptadas" valor={cuenta("aceptadas")} sub={importes ? eur(suma(GRUPOS.aceptadas)) : undefined} />
        <Kpi icono="reporting" label="Tasa de aceptación" valor={`${Math.round((cuenta("aceptadas") / Math.max(1, cuenta("aceptadas") + todas.filter((p) => p.estado === "rechazada").length)) * 100)} %`} sub="Aceptadas / (aceptadas + rechazadas)" />
      </section>

      <Filtros base="/propuestas" actual={f} ops={[
        { v: "abiertas", t: "Abiertas", n: cuenta("abiertas") }, { v: "aprobacion", t: "Por aprobar", n: cuenta("aprobacion") },
        { v: "aceptadas", t: "Aceptadas", n: cuenta("aceptadas") }, { v: "cerradas", t: "Cerradas", n: cuenta("cerradas") }, { v: "todas", t: "Todas", n: todas.length },
      ]} />

      <Tarjeta sinPadding>
        {lista.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                <th className="px-5 py-3 font-medium">Propuesta</th><th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Evento</th><th className="px-5 py-3 font-medium">Estado</th>
                {importes && <th className="px-5 py-3 text-right font-medium">Importe</th>}
                {importes && <th className="px-5 py-3 text-right font-medium">Margen</th>}
              </tr></thead>
              <tbody>
                {lista.map((p) => {
                  const t = tot.get(p.id);
                  const cli = (p.leads as unknown as { clientes: { nombre: string } | null } | null)?.clientes?.nombre;
                  const e = EST_PROPUESTA[p.estado];
                  const mpct = t?.total ? Math.round((Number(t.margen) / Number(t.total)) * 100) : null;
                  return (
                    <tr key={p.id} className="border-t border-stone/40 hover:bg-cream/50">
                      <td className="px-5 py-3"><Link href={`/propuestas/${p.id}`} className="font-medium hover:text-olive">{p.titulo}</Link><p className="text-xs text-espresso/50">{p.codigo} · v{p.version}</p></td>
                      <td className="px-5 py-3">{cli ?? "—"}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{p.fecha_evento ? fFecha(p.fecha_evento) : "—"}{p.asistentes ? <span className="text-espresso/50"> · {p.asistentes} pax</span> : null}</td>
                      <td className="px-5 py-3"><Insignia tono={e?.tono}>{e?.t ?? p.estado}</Insignia></td>
                      {importes && <td className="px-5 py-3 text-right font-medium">{eur(t?.total)}</td>}
                      {importes && <td className={`px-5 py-3 text-right ${mpct !== null && mpct < 25 ? "text-bronze" : ""}`}>{mpct !== null ? `${mpct} %` : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Vacio>No hay propuestas en este filtro.</Vacio>}
      </Tarjeta>
    </div>
  );
}
