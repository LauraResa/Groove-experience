import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { Icono } from "./Icono";

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const TZ = "Europe/Madrid";
const DIA = 864e5;

const ESTADO_EVENTO: Record<string, { txt: string; cls: string }> = {
  preproduccion: { txt: "Preproducción", cls: "bg-sand text-espresso/80" },
  produccion: { txt: "Producción", cls: "bg-bronze/20 text-bronze" },
  confirmado: { txt: "Confirmado", cls: "bg-olive/15 text-olive-deep" },
  en_ejecucion: { txt: "En ejecución", cls: "bg-olive text-cream" },
  finalizado: { txt: "Finalizado", cls: "bg-stone/50 text-espresso/60" },
};

type Est = { nombre: string; es_ganado: boolean; es_perdido: boolean } | null;

export default async function Inicio() {
  const s = await getSesion();
  const supabase = await createClient();
  const verImportes = puede(s, "inicio", "ver_importes");
  const ahora = new Date();
  const hoy = ahora.toISOString().slice(0, 10);
  const en1año = new Date(ahora.getTime() + 365 * DIA).toISOString().slice(0, 10);
  const en21 = new Date(ahora.getTime() + 21 * DIA).toISOString().slice(0, 10);
  const hace30 = new Date(ahora.getTime() - 30 * DIA).toISOString().slice(0, 10);

  const hora = Number(ahora.toLocaleString("es-ES", { hour: "numeric", hour12: false, timeZone: TZ }));
  const saludo = hora < 14 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches";
  const fechaLarga = ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });

  const [{ data: leads }, { data: eventos }, { data: tareas }, { data: aprob }] = await Promise.all([
    supabase.from("leads").select("id, titulo, fecha_entrada, fecha_prevista, presupuesto_estimado, proxima_accion, estados_lead(nombre, es_ganado, es_perdido)"),
    supabase.from("eventos").select("id, nombre, fecha, estado, categorias(nombre)").gte("fecha", hoy).lte("fecha", en1año).neq("estado", "cancelado").order("fecha"),
    supabase.from("tareas").select("id, titulo, fecha, prioridad").neq("estado", "finalizado").lte("fecha", en21).order("fecha").limit(6),
    supabase.from("aprobaciones").select("id").eq("estado", "pendiente"),
  ]);

  const ls = (leads ?? []).map((l) => ({ ...l, est: l.estados_lead as unknown as Est }));
  const activos = ls.filter((l) => !l.est?.es_ganado && !l.est?.es_perdido);
  const enPropuesta = activos.filter((l) => ["Propuesta enviada", "Negociación", "Pendiente aprobación Groove"].includes(l.est?.nombre ?? ""));
  const pipeline = activos.reduce((t, l) => t + Number(l.presupuesto_estimado ?? 0), 0);
  const sinAccion = activos.filter((l) => !l.proxima_accion).length;
  const nuevos = ls.filter((l) => l.fecha_entrada >= hace30).length;
  const evs = eventos ?? [];
  const proximo = evs[0];
  const diasA = (f: string) => Math.max(0, Math.round((new Date(f).getTime() - new Date(hoy).getTime()) / DIA));

  const kpis = [
    puede(s, "eventos") && { icono: "eventos", label: "Eventos próximos", valor: evs.length, sub: "En los próximos 12 meses" },
    puede(s, "leads") && { icono: "leads", label: "Leads activos", valor: activos.length, sub: `${nuevos} nuevos en 30 días` },
    puede(s, "leads") && verImportes && { icono: "finanzas", label: "Pipeline estimado", valor: eur(pipeline), sub: `${enPropuesta.length} en propuesta o negociación` },
    puede(s, "leads") && !verImportes && { icono: "propuestas", label: "En propuesta", valor: enPropuesta.length, sub: "Enviadas o en negociación" },
  ].filter(Boolean) as { icono: string; label: string; valor: string | number; sub: string }[];

  const atencion = [
    puede(s, "aprobaciones") && (aprob?.length ?? 0) > 0 && { icono: "alerta", tono: "bg-bronze/20 text-bronze", titulo: `${aprob!.length} aprobaciones pendientes`, texto: "Propuestas fuera de condiciones estándar.", href: "/propuestas" },
    puede(s, "leads") && sinAccion > 0 && { icono: "leads", tono: "bg-olive/15 text-olive-deep", titulo: `${sinAccion} leads sin próxima acción`, texto: "Definid el siguiente paso para no perderlos.", href: "/leads" },
    puede(s, "leads") && enPropuesta.length > 0 && { icono: "propuestas", tono: "bg-sand text-espresso/70", titulo: `${enPropuesta.length} propuestas abiertas`, texto: "Pendientes de respuesta del cliente.", href: "/leads" },
  ].filter(Boolean) as { icono: string; tono: string; titulo: string; texto: string; href: string }[];

  // 12 meses: eventos (relleno) + leads con fecha prevista (provisional)
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nombre = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
    return {
      clave,
      etiqueta: i === 0 || d.getMonth() === 0 ? `${nombre} '${String(d.getFullYear()).slice(2)}` : nombre,
      eventos: evs.filter((e) => e.fecha.startsWith(clave)).length,
      provisionales: activos.filter((l) => l.fecha_prevista?.startsWith(clave)).length,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="aparecer flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight">{saludo}, {s.nombre.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-espresso/60 first-letter:uppercase">{fechaLarga}</p>
        </div>
        <div className="flex gap-2">
          {puede(s, "solicitudes", "crear") && (
            <Link href="/leads?nuevo=1" className="inline-flex items-center gap-1.5 rounded-lg border border-stone bg-cream/70 px-4 py-2 text-sm hover:border-olive transition">
              <Icono n="mas" className="h-4 w-4" /> Solicitud
            </Link>
          )}
          {puede(s, "leads", "crear") && (
            <Link href="/leads?nuevo=1" className="inline-flex items-center gap-1.5 rounded-lg bg-olive px-4 py-2 text-sm text-cream shadow-md shadow-olive/25 hover:bg-olive-deep transition">
              <Icono n="mas" className="h-4 w-4" /> Nuevo lead
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {puede(s, "eventos") && (
          <div className="aparecer relative col-span-2 lg:col-span-1 overflow-hidden rounded-2xl sidebar-fondo p-5 text-cream shadow-lg shadow-olive-deep/25">
            <div aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full border border-cream/15" />
            <div aria-hidden className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-bronze/20 blur-xl" />
            <p className="flex items-center gap-1.5 text-xs text-cream/75"><Icono n="reloj" className="h-4 w-4" /> Próximo evento</p>
            {proximo ? (
              <>
                <p className="mt-2 font-serif text-4xl">{diasA(proximo.fecha)} <span className="text-base">días</span></p>
                <p className="mt-1 truncate text-sm text-cream/80">{proximo.nombre} · {new Date(proximo.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
              </>
            ) : (
              <>
                <p className="mt-2 font-serif text-3xl">—</p>
                <p className="mt-1 text-sm text-cream/70">Aún no hay eventos cerrados</p>
              </>
            )}
          </div>
        )}
        {kpis.map((k, i) => (
          <div key={k.label} className="tarjeta tarjeta-viva aparecer p-5" style={{ animationDelay: `${80 + i * 60}ms` }}>
            <p className="flex items-center gap-1.5 text-xs text-espresso/60"><Icono n={k.icono} className="h-4 w-4" /> {k.label}</p>
            <p className="mt-2 font-serif text-3xl">{k.valor}</p>
            <p className="mt-1 text-xs text-espresso/55">{k.sub}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-4 aparecer" style={{ animationDelay: "300ms" }}>
        {puede(s, "eventos") && (
          <div className="tarjeta lg:col-span-2 overflow-hidden">
            <div className="flex items-baseline justify-between px-5 py-4 border-b border-stone/60">
              <h2 className="font-serif text-lg">Próximos eventos</h2>
              <Link href="/eventos" className="text-xs text-olive hover:text-bronze transition">Ver todos →</Link>
            </div>
            {evs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                      <th className="px-5 py-3 font-medium">Fecha</th>
                      <th className="px-5 py-3 font-medium">Evento</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evs.slice(0, 8).map((e) => {
                      const est = ESTADO_EVENTO[e.estado] ?? ESTADO_EVENTO.preproduccion;
                      const cat = e.categorias as unknown as { nombre: string } | null;
                      return (
                        <tr key={e.id} className="border-t border-stone/40 hover:bg-cream/50 transition">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="font-medium">{new Date(e.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
                            <p className="text-xs text-espresso/50">En {diasA(e.fecha)} días</p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium">{e.nombre}</p>
                            {cat && <p className="flex items-center gap-1.5 text-xs text-espresso/55"><span className="h-1.5 w-1.5 rounded-full bg-bronze" />{cat.nombre}</p>}
                          </td>
                          <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${est.cls}`}>{est.txt}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-espresso/50">Todavía no hay eventos. Se crean al confirmar una propuesta.</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="tarjeta overflow-hidden">
            <h2 className="font-serif text-lg px-5 py-4 border-b border-stone/60">Requiere atención</h2>
            {atencion.length ? atencion.map((a) => (
              <Link key={a.titulo} href={a.href} className="flex items-center gap-3 px-5 py-3.5 border-t border-stone/40 first:border-t-0 hover:bg-cream/50 transition">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${a.tono}`}><Icono n={a.icono} className="h-4 w-4" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{a.titulo}</span>
                  <span className="block text-xs text-espresso/55">{a.texto}</span>
                </span>
                <Icono n="flecha" className="h-4 w-4 text-espresso/40" />
              </Link>
            )) : (
              <p className="px-5 py-6 text-center text-sm text-espresso/50">Todo en orden.</p>
            )}
          </div>

          {puede(s, "tareas") && (
            <div className="tarjeta overflow-hidden">
              <div className="flex items-baseline justify-between px-5 py-4 border-b border-stone/60">
                <h2 className="font-serif text-lg">Tareas próximas</h2>
                <span className="text-xs text-espresso/50">21 días</span>
              </div>
              {tareas?.length ? (
                <ul className="divide-y divide-stone/40">
                  {tareas.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2 px-5 py-3 text-sm">
                      <span className="truncate">{t.titulo}</span>
                      <span className="shrink-0 text-xs text-espresso/55">{t.fecha}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-center text-sm text-espresso/50">Nada pendiente en las próximas tres semanas.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {(puede(s, "eventos") || puede(s, "leads")) && (
        <section className="tarjeta aparecer overflow-hidden" style={{ animationDelay: "450ms" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 border-b border-stone/60">
            <h2 className="font-serif text-lg">Próximos 12 meses</h2>
            <div className="flex gap-4 text-xs text-espresso/60">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-olive" />Evento</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-bronze" />Lead con fecha</span>
            </div>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-12">
            {meses.map((m) => (
              <div key={m.clave} className="flex flex-col items-center justify-end gap-2 border-l border-stone/40 first:border-l-0 px-1 pt-6 pb-4 min-h-24">
                <div className="flex flex-wrap justify-center gap-1">
                  {Array.from({ length: Math.min(m.eventos, 6) }).map((_, i) => <span key={`e${i}`} className="h-2.5 w-2.5 rounded-full bg-olive" />)}
                  {Array.from({ length: Math.min(m.provisionales, 6) }).map((_, i) => <span key={`p${i}`} className="h-2.5 w-2.5 rounded-full border border-bronze" />)}
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-espresso/55">{m.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
