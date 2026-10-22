import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function Inicio() {
  const s = await getSesion();
  const supabase = await createClient();
  const verImportes = puede(s, "inicio", "ver_importes");
  const hoy = new Date().toISOString().slice(0, 10);
  const hora = Number(new Date().toLocaleString("es-ES", { hour: "numeric", hour12: false, timeZone: "Europe/Madrid" }));
  const saludo = hora < 14 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches";
  const fechaLarga = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  const [{ data: leads }, { data: eventos }, { data: tareas }, { data: aprob }] = await Promise.all([
    supabase.from("leads").select("id, fecha_entrada, presupuesto_estimado, estados_lead(nombre, es_ganado, es_perdido)"),
    supabase.from("eventos").select("id, codigo, nombre, fecha, estado").gte("fecha", hoy).neq("estado", "cancelado").order("fecha").limit(5),
    supabase.from("tareas").select("id, titulo, fecha, prioridad").neq("estado", "finalizado").order("fecha", { nullsFirst: false }).limit(5),
    supabase.from("aprobaciones").select("id, motivo, solicitada_en").eq("estado", "pendiente"),
  ]);

  type Est = { nombre: string; es_ganado: boolean; es_perdido: boolean } | null;
  const ls = (leads ?? []).map((l) => ({ ...l, est: l.estados_lead as unknown as Est }));
  const activos = ls.filter((l) => !l.est?.es_ganado && !l.est?.es_perdido);
  const porEstado = (n: string) => ls.filter((l) => l.est?.nombre === n).length;
  const pipeline = activos.reduce((t, l) => t + Number(l.presupuesto_estimado ?? 0), 0);
  const cerrado = ls.filter((l) => l.est?.es_ganado).reduce((t, l) => t + Number(l.presupuesto_estimado ?? 0), 0);

  const kpis = [
    puede(s, "leads") && { label: "Leads activos", valor: activos.length },
    puede(s, "leads") && { label: "Nuevos (30 días)", valor: ls.filter((l) => l.fecha_entrada >= hace30).length },
    puede(s, "leads") && { label: "Propuestas enviadas", valor: porEstado("Propuesta enviada") },
    puede(s, "leads") && { label: "En negociación", valor: porEstado("Negociación") },
    puede(s, "eventos") && { label: "Próximos eventos", valor: eventos?.length ?? 0 },
    verImportes && puede(s, "leads") && { label: "Pipeline estimado", valor: eur(pipeline), acento: true },
    verImportes && puede(s, "leads") && { label: "Cerrado (estimado)", valor: eur(cerrado), acento: true },
    puede(s, "aprobaciones") && { label: "Aprobaciones pendientes", valor: aprob?.length ?? 0 },
  ].filter(Boolean) as { label: string; valor: string | number; acento?: boolean }[];

  return (
    <div className="space-y-8 max-w-6xl">
      <header className="aparecer space-y-2">
        <p className="antetitulo">{fechaLarga}</p>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">
          {saludo}, <em className="text-olive">{s.nombre.split(" ")[0]}</em>
        </h1>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={k.label} className="tarjeta tarjeta-viva aparecer p-4 md:p-5" style={{ animationDelay: `${80 + i * 60}ms` }}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-espresso/55">{k.label}</p>
            <p className={`mt-2 text-2xl md:text-3xl font-serif ${k.acento ? "text-bronze" : ""}`}>{k.valor}</p>
          </div>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-4 aparecer" style={{ animationDelay: "500ms" }}>
        {puede(s, "eventos") && (
          <Panel titulo="Próximos eventos" href="/eventos">
            {eventos?.length ? eventos.map((e) => (
              <li key={e.id} className="flex justify-between gap-2"><span className="truncate">{e.nombre}</span><span className="text-espresso/60 shrink-0">{e.fecha}</span></li>
            )) : <Vacio />}
          </Panel>
        )}
        {puede(s, "tareas") && (
          <Panel titulo="Tareas pendientes" href="/tareas">
            {tareas?.length ? tareas.map((t) => (
              <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.titulo}</span><span className="text-espresso/60 shrink-0">{t.fecha ?? "—"}</span></li>
            )) : <Vacio />}
          </Panel>
        )}
      </section>
    </div>
  );
}

function Panel({ titulo, href, children }: { titulo: string; href: string; children: React.ReactNode }) {
  return (
    <div className="tarjeta p-5 md:p-6">
      <div className="flex justify-between items-baseline mb-4 pb-3 border-b border-stone/60">
        <h2 className="font-serif text-xl">{titulo}</h2>
        <Link href={href} className="text-xs text-olive hover:text-bronze transition">Ver todo →</Link>
      </div>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

const Vacio = () => <li className="text-espresso/45 italic font-serif">Nada por aquí todavía</li>;
