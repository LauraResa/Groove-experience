import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { eur, fFecha, hoyMadrid } from "@/lib/fechas";
import { EST_EVENTO } from "@/lib/estados";
import { Cabecera, Campo, Filtros, Insignia, Kpi, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

export default async function Eventos({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "eventos")) notFound();
  const { f = "proximos" } = await searchParams;
  const importes = puede(s, "eventos", "ver_importes");
  const hoy = hoyMadrid();
  const supabase = await createClient();

  const [{ data: eventos }, { data: fin }, { data: categorias }, { data: formatos }, { data: clientes }] = await Promise.all([
    supabase.from("eventos").select("id, codigo, nombre, fecha, hora_inicio, estado, aforo, formato_id, clientes(nombre), categorias(nombre), perfiles(nombre), formatos(nombre)").order("fecha", { ascending: f !== "pasados" }),
    importes ? supabase.from("evento_finanzas_resumen").select("evento_id, facturacion, extras, pendiente") : Promise.resolve({ data: [] as { evento_id: string; facturacion: number; extras: number; pendiente: number }[] }),
    supabase.from("categorias").select("id, nombre").not("padre_id", "is", null).eq("activa", true).order("orden"),
    supabase.from("formatos").select("id, nombre").order("nombre"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);
  const fm = new Map((fin ?? []).map((x) => [x.evento_id, x]));
  const todos = eventos ?? [];
  const lista = todos.filter((e) =>
    f === "proximos" ? e.fecha >= hoy && e.estado !== "cancelado" :
    f === "pasados" ? e.fecha < hoy || e.estado === "finalizado" :
    f === "formatos" ? !!e.formato_id : true);
  const proximos = todos.filter((e) => e.fecha >= hoy && e.estado !== "cancelado");
  const facturacion = proximos.reduce((a, e) => a + Number(fm.get(e.id)?.facturacion ?? 0) + Number(fm.get(e.id)?.extras ?? 0), 0);
  const pendiente = todos.reduce((a, e) => a + Math.max(0, Number(fm.get(e.id)?.pendiente ?? 0)), 0);
  const diasA = (d: string) => Math.round((new Date(d).getTime() - new Date(hoy).getTime()) / 864e5);

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Producción" titulo="Eventos" sub="Los eventos nacen al convertir una propuesta aceptada, o se crean a mano (formatos propios, eventos internos).">
        {puede(s, "contenidos") && <Link href="/contenidos" className="inline-flex items-center gap-1.5 rounded-lg border border-stone bg-cream/70 px-4 py-2 text-sm hover:border-olive transition">Contenidos</Link>}
        {puede(s, "eventos", "crear") && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Nuevo evento</>} titulo="Nuevo evento">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "eventos", _volver: "/eventos", _ir: "/eventos/" }} />
              <Campo t="Nombre"><input name="nombre" required className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Fecha"><input name="fecha" type="date" required className={campo} /></Campo>
                <Campo t="Aforo"><input name="aforo" type="number" min="0" className={campo} /></Campo>
                <Campo t="Hora inicio"><input name="hora_inicio" type="time" className={campo} /></Campo>
                <Campo t="Hora fin"><input name="hora_fin" type="time" className={campo} /></Campo>
              </div>
              <Campo t="Cliente"><Sel name="cliente_id" ops={clientes ?? []} vacio="— Sin cliente (formato propio / interno) —" /></Campo>
              <Campo t="Formato propio"><Sel name="formato_id" ops={formatos ?? []} vacio="— No es un formato propio —" /></Campo>
              <Campo t="Categoría"><Sel name="categoria_id" ops={categorias ?? []} vacio="—" /></Campo>
              <input type="hidden" name="responsable_id" value={s.id} />
              <button className={`${boton} w-full`}>Crear evento</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi destacado icono="reloj" label="Próximo evento" valor={proximos[0] ? <>{diasA(proximos[0].fecha)} <span className="text-base">días</span></> : "—"} sub={proximos[0] ? `${proximos[0].nombre} · ${fFecha(proximos[0].fecha, { day: "numeric", month: "short" })}` : "Sin eventos próximos"} />
        <Kpi icono="eventos" label="Próximos" valor={proximos.length} sub={`${proximos.filter((e) => e.estado === "confirmado").length} confirmados`} />
        {importes ? <Kpi icono="finanzas" label="Facturación prevista" valor={eur(facturacion)} sub="Eventos próximos" /> : <Kpi icono="formatos" label="Formatos propios" valor={todos.filter((e) => e.formato_id).length} />}
        {importes ? <Kpi icono="alerta" label="Pendiente de cobro" valor={eur(pendiente)} /> : <Kpi icono="calendario" label="Este mes" valor={proximos.filter((e) => e.fecha.slice(0, 7) === hoy.slice(0, 7)).length} />}
      </section>

      <Filtros base="/eventos" actual={f} ops={[{ v: "proximos", t: "Próximos" }, { v: "pasados", t: "Pasados" }, { v: "formatos", t: "Formatos propios" }, { v: "todos", t: "Todos" }]} />

      <Tarjeta sinPadding>
        {lista.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                <th className="px-5 py-3 font-medium">Fecha</th><th className="px-5 py-3 font-medium">Evento</th>
                <th className="px-5 py-3 font-medium">Responsable</th><th className="px-5 py-3 font-medium">Estado</th>
                {importes && <th className="px-5 py-3 text-right font-medium">Facturación</th>}
                {importes && <th className="px-5 py-3 text-right font-medium">Pendiente</th>}
              </tr></thead>
              <tbody>
                {lista.map((e) => {
                  const x = fm.get(e.id);
                  const sub = (e.formatos as unknown as { nombre: string } | null)?.nombre ?? (e.clientes as unknown as { nombre: string } | null)?.nombre;
                  const cat = (e.categorias as unknown as { nombre: string } | null)?.nombre;
                  const d = diasA(e.fecha);
                  return (
                    <tr key={e.id} className="border-t border-stone/40 hover:bg-cream/50">
                      <td className="px-5 py-3 whitespace-nowrap"><p className="font-medium">{fFecha(e.fecha, { day: "numeric", month: "short", year: "2-digit" })}</p><p className="text-xs text-espresso/50">{d >= 0 ? `En ${d} días` : `Hace ${-d} días`}</p></td>
                      <td className="px-5 py-3"><Link href={`/eventos/${e.id}`} className="font-medium hover:text-olive">{e.nombre}</Link>
                        <p className="flex items-center gap-1.5 text-xs text-espresso/55">{cat && <><span className="h-1.5 w-1.5 rounded-full bg-bronze" />{cat}</>}{sub && <span>· {sub}</span>}{e.aforo ? <span>· {e.aforo} pax</span> : null}</p></td>
                      <td className="px-5 py-3 text-espresso/70">{(e.perfiles as unknown as { nombre: string } | null)?.nombre ?? "—"}</td>
                      <td className="px-5 py-3"><Insignia tono={EST_EVENTO[e.estado]?.tono}>{EST_EVENTO[e.estado]?.t}</Insignia></td>
                      {importes && <td className="px-5 py-3 text-right">{x ? eur(Number(x.facturacion) + Number(x.extras)) : <span className="text-espresso/40">Sin importe</span>}</td>}
                      {importes && <td className={`px-5 py-3 text-right ${Number(x?.pendiente ?? 0) > 0 ? "text-bronze" : "text-espresso/50"}`}>{x ? eur(x.pendiente) : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Vacio>No hay eventos en este filtro.</Vacio>}
      </Tarjeta>
    </div>
  );
}
