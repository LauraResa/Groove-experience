import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { fHora, hoyMadrid } from "@/lib/fechas";
import { Cabecera, Campo, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

type Item = { capa: string; id: string; titulo: string; inicio: string; fin: string; estilo: string };

const ESTILO: Record<string, { t: string; chip: string; punto: string }> = {
  evento_confirmado: { t: "Evento", chip: "bg-olive text-cream", punto: "bg-olive" },
  formato_propio: { t: "Formato propio", chip: "bg-bronze text-cream", punto: "bg-bronze" },
  provisional: { t: "Propuesta / provisional", chip: "border border-dashed border-bronze bg-sand/70 text-espresso", punto: "border border-dashed border-bronze" },
  reunion: { t: "Reunión / visita", chip: "border border-olive/60 bg-cream text-olive-deep", punto: "border border-olive" },
  sesion_groove: { t: "Sesión Groove", chip: "bg-espresso text-cream", punto: "bg-espresso" },
  bloqueo: { t: "Bloqueado", chip: "bg-stone text-espresso/70 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(46,42,38,.08)_4px,rgba(46,42,38,.08)_8px)]", punto: "bg-stone" },
  no_disponible: { t: "No disponible", chip: "bg-stone text-espresso/70 line-through", punto: "bg-stone" },
  montaje: { t: "Montaje", chip: "bg-sand text-espresso", punto: "bg-sand" },
  desmontaje: { t: "Desmontaje", chip: "bg-sand text-espresso", punto: "bg-sand" },
  otro: { t: "Otro", chip: "bg-sand text-espresso", punto: "bg-sand" },
  hito: { t: "Hito roadmap", chip: "border border-espresso/30 bg-cream text-espresso/70", punto: "border border-espresso/40" },
};
const TIPOS_BLOQUE = [
  { id: "sesion_groove", nombre: "Sesión Groove" }, { id: "bloqueo", nombre: "Bloqueo" }, { id: "no_disponible", nombre: "Fecha no disponible" },
  { id: "montaje", nombre: "Montaje" }, { id: "desmontaje", nombre: "Desmontaje" }, { id: "otro", nombre: "Otro" },
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TZ = "Europe/Madrid";

const diaMadrid = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
const soloFecha = (iso: string) => /T00:00:00(\.000)?(Z|\+00(:00)?)$/.test(iso) || /^\d{4}-\d{2}-\d{2}$/.test(iso);
/** días (YYYY-MM-DD) que ocupa un elemento */
function dias(it: Item) {
  const ini = soloFecha(it.inicio) ? it.inicio.slice(0, 10) : diaMadrid(it.inicio);
  const finMs = new Date(it.fin).getTime() - 1;
  const fin = soloFecha(it.fin) ? new Date(finMs).toISOString().slice(0, 10) : diaMadrid(new Date(finMs).toISOString());
  const out: string[] = [];
  for (let d = new Date(`${ini}T12:00:00Z`); d.toISOString().slice(0, 10) <= fin && out.length < 60; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out.length ? out : [ini];
}
const sumar = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const lunes = (ymd: string) => { const d = new Date(`${ymd}T12:00:00Z`); return sumar(ymd, -((d.getUTCDay() + 6) % 7)); };
const OCUPA = new Set(["evento_confirmado", "formato_propio", "provisional", "sesion_groove", "bloqueo", "no_disponible"]);

export default async function Calendario({ searchParams }: { searchParams: Promise<{ d?: string; vista?: string; tipo?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "calendario")) notFound();
  const sp = await searchParams;
  const vista = sp.vista ?? "mes";
  const tipo = sp.tipo ?? "todo";
  const hoy = hoyMadrid();
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : hoy;
  const crear = puede(s, "calendario", "crear");
  const reunion = puede(s, "leads", "crear");

  // rango visible
  const primeroMes = `${ref.slice(0, 7)}-01`;
  const desde = vista === "mes" ? lunes(primeroMes) : vista === "semana" ? lunes(ref) : ref;
  const ndias = vista === "mes" ? 42 : vista === "semana" ? 7 : 1;
  const hasta = sumar(desde, ndias);

  const supabase = await createClient();
  const [{ data }, { data: espacios }, { data: leads }] = await Promise.all([
    supabase.from("calendario").select("*").lt("inicio", `${hasta}T23:59:59Z`).gt("fin", `${sumar(desde, -1)}T00:00:00Z`).order("inicio"),
    supabase.from("espacios").select("id, nombre").order("nombre"),
    reunion ? supabase.from("leads").select("id, titulo").order("actualizado_en", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
  ]);
  const todos = ((data ?? []) as Item[]).filter((i) =>
    tipo === "todo" ? true : tipo === "eventos" ? ["evento", "propuesta"].includes(i.capa) : tipo === "reuniones" ? i.capa === "actividad" : i.capa === "bloque");

  // solapes entre elementos que ocupan el venue
  const ocupan = todos.filter((i) => OCUPA.has(i.estilo));
  const solapa = new Set<string>();
  for (let a = 0; a < ocupan.length; a++) for (let b = a + 1; b < ocupan.length; b++) {
    const x = ocupan[a], y = ocupan[b];
    if (new Date(x.inicio) < new Date(y.fin) && new Date(y.inicio) < new Date(x.fin)) { solapa.add(x.id); solapa.add(y.id); }
  }

  const porDia = new Map<string, Item[]>();
  for (const it of todos) for (const d of dias(it)) porDia.set(d, [...(porDia.get(d) ?? []), it]);

  const href = (i: Item) => i.capa === "evento" ? `/eventos/${i.id}` : i.capa === "propuesta" ? `/propuestas/${i.id}` : i.capa === "roadmap" ? "/roadmap" : null;
  const enlace = (o: Partial<{ d: string; vista: string; tipo: string }>) => {
    const p = new URLSearchParams({ d: o.d ?? ref, vista: o.vista ?? vista, tipo: o.tipo ?? tipo });
    return `/calendario?${p}`;
  };
  const paso = vista === "mes" ? null : vista === "semana" ? 7 : 1;
  const ant = paso ? sumar(ref, -paso) : (() => { const d = new Date(`${primeroMes}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 10); })();
  const sig = paso ? sumar(ref, paso) : (() => { const d = new Date(`${primeroMes}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10); })();
  const titulo = vista === "mes"
    ? new Date(`${primeroMes}T12:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : vista === "semana" ? `Semana del ${new Date(`${desde}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`
    : new Date(`${ref}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const listaLateral = todos.filter((i) => dias(i).some((d) => vista === "mes" ? d.startsWith(ref.slice(0, 7)) : d >= desde && d < hasta));

  const Chip = ({ i, largo }: { i: Item; largo?: boolean }) => {
    const e = ESTILO[i.estilo] ?? ESTILO.otro;
    const h = href(i);
    const hora = soloFecha(i.inicio) ? "" : `${fHora(i.inicio)} `;
    const cont = <span className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${e.chip}`}>{solapa.has(i.id) && "⚠ "}{hora}{i.titulo}{largo && !soloFecha(i.fin) ? ` – ${fHora(i.fin)}` : ""}</span>;
    return h ? <Link href={h} title={i.titulo}>{cont}</Link> : <span title={i.titulo}>{cont}</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Producción" titulo="Calendario" sub="Eventos, propuestas provisionales, reuniones, sesiones Groove y bloqueos. Los fines de semana aparecen resaltados.">
        {reunion && (
          <Cajon variante="secundario" boton={<><Icono n="mas" className="h-4 w-4" />Reunión / visita</>} titulo="Nueva reunión o visita">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "actividades", _volver: "/calendario" }} />
              <Campo t="Tipo"><Sel name="tipo" ops={[{ id: "reunion", nombre: "Reunión" }, { id: "visita", nombre: "Visita" }]} /></Campo>
              <Campo t="Asunto"><input name="descripcion" required className={campo} placeholder="Ej. Visita técnica ACME" /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Inicio"><input name="inicio" type="datetime-local" required defaultValue={`${ref}T10:00`} className={campo} /></Campo>
                <Campo t="Fin"><input name="fin" type="datetime-local" defaultValue={`${ref}T11:00`} className={campo} /></Campo>
              </div>
              <Campo t="Lead relacionado"><Sel name="lead_id" ops={(leads ?? []).map((l) => ({ id: l.id, nombre: l.titulo }))} vacio="— Ninguno —" /></Campo>
              <button className={`${boton} w-full`}>Guardar</button>
            </form>
          </Cajon>
        )}
        {crear && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Sesión / bloqueo</>} titulo="Sesión Groove, bloqueo o fecha no disponible">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "calendario_bloques", _volver: "/calendario" }} />
              <Campo t="Tipo"><Sel name="tipo" ops={TIPOS_BLOQUE} /></Campo>
              <Campo t="Título"><input name="titulo" required className={campo} placeholder="Ej. Sesión Groove · noche" /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Inicio"><input name="inicio" type="datetime-local" required defaultValue={`${ref}T22:00`} className={campo} /></Campo>
                <Campo t="Fin"><input name="fin" type="datetime-local" required defaultValue={`${sumar(ref, 1)}T06:00`} className={campo} /></Campo>
              </div>
              <Campo t="Espacio"><Sel name="espacio_id" ops={espacios ?? []} vacio="Todo el venue" /></Campo>
              <Campo t="Notas"><textarea name="notas" rows={2} className={campo} /></Campo>
              <button className={`${boton} w-full`}>Guardar</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="tarjeta aparecer overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-stone/60 px-4 py-3">
            <Link href={enlace({ d: ant })} className="grid h-8 w-8 place-items-center rounded-lg border border-stone hover:border-olive" aria-label="Anterior">‹</Link>
            <Link href={enlace({ d: sig })} className="grid h-8 w-8 place-items-center rounded-lg border border-stone hover:border-olive" aria-label="Siguiente">›</Link>
            <h2 className="font-serif text-lg first-letter:uppercase mx-2">{titulo}</h2>
            <Link href={enlace({ d: hoy })} className="rounded-lg border border-stone px-3 py-1 text-xs hover:border-olive">Hoy</Link>
            <nav className="ml-auto flex gap-1 rounded-lg bg-stone/30 p-0.5">
              {["mes", "semana", "dia"].map((v) => (
                <Link key={v} href={enlace({ vista: v })} className={`rounded-md px-3 py-1 text-xs capitalize ${vista === v ? "bg-cream shadow-sm font-medium" : "text-espresso/60"}`}>{v === "dia" ? "Día" : v}</Link>
              ))}
            </nav>
          </div>

          {vista === "dia" ? (
            <div className="divide-y divide-stone/40">
              {(porDia.get(ref) ?? []).length ? (porDia.get(ref) ?? []).map((i) => (
                <div key={`${i.capa}${i.id}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-28 shrink-0 text-xs text-espresso/60">{soloFecha(i.inicio) ? "Todo el día" : `${fHora(i.inicio)} – ${fHora(i.fin)}`}</span>
                  <div className="flex-1"><Chip i={i} /></div>
                  <span className="text-xs text-espresso/55">{(ESTILO[i.estilo] ?? ESTILO.otro).t}</span>
                </div>
              )) : <Vacio>Día libre.</Vacio>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[44rem] grid-cols-7">
                {DIAS.map((d, i) => <div key={d} className={`border-b border-stone/50 py-2 text-center text-[10px] uppercase tracking-[0.15em] text-espresso/55 ${i > 4 ? "bg-sand/40" : ""}`}>{d}</div>)}
                {Array.from({ length: ndias }, (_, k) => {
                  const d = sumar(desde, k);
                  const fuera = vista === "mes" && !d.startsWith(ref.slice(0, 7));
                  const finde = k % 7 > 4;
                  const its = porDia.get(d) ?? [];
                  return (
                    <div key={d} className={`border-b border-r border-stone/40 p-1.5 ${vista === "semana" ? "min-h-64" : "min-h-24"} ${finde ? "bg-sand/40" : ""} ${fuera ? "opacity-45" : ""}`}>
                      <Link href={enlace({ d, vista: "dia" })} className={`mb-1 inline-grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs ${d === hoy ? "bg-olive text-cream font-semibold" : "hover:bg-stone/40"}`}>{Number(d.slice(8))}</Link>
                      <div className="space-y-0.5">
                        {its.slice(0, vista === "semana" ? 12 : 3).map((i) => <Chip key={`${i.capa}${i.id}`} i={i} largo={vista === "semana"} />)}
                        {its.length > (vista === "semana" ? 12 : 3) && <Link href={enlace({ d, vista: "dia" })} className="block px-1 text-[10px] text-olive">+{its.length - 3} más</Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-stone/50 px-4 py-3 text-[11px] text-espresso/60">
            {["evento_confirmado", "formato_propio", "provisional", "reunion", "sesion_groove", "bloqueo", "hito"].map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${ESTILO[k].punto}`} />{ESTILO[k].t}</span>
            ))}
            {solapa.size > 0 && <span className="text-bronze">⚠ Solape de ocupación</span>}
          </div>
        </section>

        <Tarjeta sinPadding className="h-fit">
          <nav className="m-3 flex gap-1 rounded-lg bg-stone/30 p-0.5">
            {[{ v: "todo", t: "Todo" }, { v: "eventos", t: "Eventos" }, { v: "reuniones", t: "Reuniones" }, { v: "bloques", t: "Bloqueos" }].map((o) => (
              <Link key={o.v} href={enlace({ tipo: o.v })} className={`flex-1 rounded-md py-1.5 text-center text-xs ${tipo === o.v ? "bg-cream shadow-sm font-medium" : "text-espresso/60"}`}>{o.t}</Link>
            ))}
          </nav>
          <p className="px-5 pb-2 font-serif text-base first-letter:uppercase">{titulo}</p>
          {listaLateral.length ? (
            <ul className="max-h-[36rem] divide-y divide-stone/40 overflow-y-auto">
              {listaLateral.map((i) => {
                const d = dias(i)[0];
                const h = href(i);
                const e = ESTILO[i.estilo] ?? ESTILO.otro;
                const fila = (
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <div className="w-11 shrink-0 rounded-lg border border-stone/60 bg-cream/60 py-1 text-center">
                      <p className="text-[9px] uppercase text-espresso/50">{new Date(`${d}T12:00:00Z`).toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</p>
                      <p className="font-serif text-lg leading-none">{Number(d.slice(8))}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{solapa.has(i.id) && <span className="text-bronze">⚠ </span>}{i.titulo}</p>
                      <p className="text-xs text-espresso/55">{e.t}{!soloFecha(i.inicio) && ` · ${fHora(i.inicio)}`}</p>
                    </div>
                    {i.capa === "bloque" && crear && (
                      <form action={borrar}><Ocultos v={{ _tabla: "calendario_bloques", _id: i.id, _volver: "/calendario" }} /><button className="text-xs text-espresso/40 hover:text-red-800" title="Quitar">×</button></form>
                    )}
                  </div>
                );
                return <li key={`${i.capa}${i.id}`}>{h ? <Link href={h} className="block hover:bg-cream/50">{fila}</Link> : fila}</li>;
              })}
            </ul>
          ) : <Vacio>Nada en este periodo.</Vacio>}
        </Tarjeta>
      </div>
    </div>
  );
}
