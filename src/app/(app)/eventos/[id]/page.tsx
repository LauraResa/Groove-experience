import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { eur, fFecha, fFechaHora, isoAInput } from "@/lib/fechas";
import { EST_EVENTO, PRIORIDADES } from "@/lib/estados";
import { Aviso, Cabecera, Campo, Insignia, Kpi, Ocultos, Sel, Tarjeta, Vacio, boton, botonMini, campo } from "@/components/ui";
import { Comentarios } from "@/components/Comentarios";
import { TareasDe } from "@/components/Tareas";
import { Espacios } from "@/components/Espacios";

const EST_CONT = ["necesidad", "en_produccion", "producido", "publicado"];
const EST_CONT_T: Record<string, string> = { necesidad: "Necesidad", en_produccion: "En producción", producido: "Producido", publicado: "Publicado" };
const quitar = "rounded-md border border-stone px-2 py-1 text-xs text-espresso/55 hover:border-red-800 hover:text-red-800";

export default async function Evento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "eventos")) notFound();
  const editar = puede(s, "eventos", "editar");
  const importes = puede(s, "eventos", "ver_importes");
  const contenidoEditar = puede(s, "contenidos", "editar") || puede(s, "contenidos", "crear");
  const supabase = await createClient();
  const volver = `/eventos/${id}`;

  const { data: e } = await supabase.from("eventos").select("*, clientes(id, nombre), formatos(id, nombre), propuestas(id, codigo)").eq("id", id).maybeSingle();
  if (!e) notFound();

  const [{ data: provs }, { data: timeline }, { data: incid }, { data: conts }, { data: fin }, { data: proveedores }, { data: perfiles }, { data: categorias }, { data: clientes }, { data: formatos }] = await Promise.all([
    supabase.from("evento_proveedores").select("*, proveedores(id, empresa, contacto, telefono, email, categorias_proveedor(nombre))").eq("evento_id", id),
    supabase.from("evento_timeline").select("*").eq("evento_id", id).order("momento"),
    supabase.from("incidencias").select("*").eq("evento_id", id).order("creado_en", { ascending: false }),
    supabase.from("contenidos").select("*, perfiles(nombre)").eq("evento_id", id),
    importes ? supabase.from("evento_finanzas_resumen").select("*").eq("evento_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("proveedores").select("id, empresa").order("empresa"),
    supabase.from("perfiles").select("id, nombre").not("rol_id", "is", null),
    supabase.from("categorias").select("id, nombre").not("padre_id", "is", null).order("orden"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("formatos").select("id, nombre").order("nombre"),
  ]);

  const { data: costes } = importes && provs?.length
    ? await supabase.from("evento_proveedores_costes").select("evento_proveedor_id, coste").in("evento_proveedor_id", provs.map((p) => p.id))
    : { data: [] as { evento_proveedor_id: string; coste: number | null }[] };
  const costeDe = new Map((costes ?? []).map((c) => [c.evento_proveedor_id, c.coste]));

  const cli = e.clientes as { id: string; nombre: string } | null;
  const fmt = e.formatos as { id: string; nombre: string } | null;
  const prop = e.propuestas as { id: string; codigo: string } | null;
  const est = EST_EVENTO[e.estado];

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera volver={{ href: "/eventos", txt: "Eventos" }} ante={e.codigo} titulo={e.nombre}
        sub={<>{fFecha(e.fecha, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{e.hora_inicio && ` · ${e.hora_inicio.slice(0, 5)}${e.hora_fin ? `–${e.hora_fin.slice(0, 5)}` : ""}`}
          {cli && <> · <Link href={`/clientes/${cli.id}`} className="text-olive hover:text-bronze">{cli.nombre}</Link></>}
          {fmt && <> · <Link href={`/formatos/${fmt.id}`} className="text-olive hover:text-bronze">{fmt.nombre}</Link></>}
          {prop && <> · <Link href={`/propuestas/${prop.id}`} className="text-olive hover:text-bronze">{prop.codigo}</Link></>}</>}>
        {editar ? (
          <form action={guardar} className="flex gap-2">
            <Ocultos v={{ _tabla: "eventos", _id: id, _volver: volver }} />
            <Sel name="estado" valor={e.estado} ops={Object.entries(EST_EVENTO).map(([k, v]) => ({ id: k, nombre: v.t }))} className={`${campo} w-auto`} />
            <button className={boton}>Cambiar</button>
          </form>
        ) : <Insignia tono={est?.tono}>{est?.t}</Insignia>}
      </Cabecera>
      <Aviso error={error} />

      {importes && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi destacado label="Facturación" valor={eur(Number(fin?.facturacion ?? 0) + Number(fin?.extras ?? 0))} sub={fin?.extras ? `Incluye ${eur(fin.extras)} de extras` : undefined} />
          <Kpi label="Costes" valor={eur(fin?.costes)} />
          <Kpi label="Cobrado" valor={eur(fin?.cobrado)} sub={`Pendiente ${eur(fin?.pendiente)}`} />
          <Kpi label="Margen" valor={eur(Number(fin?.facturacion ?? 0) + Number(fin?.extras ?? 0) - Number(fin?.costes ?? 0))} sub="Facturación − costes" />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tarjeta titulo="Proveedores" sinPadding>
            {provs?.length ? (
              <div className="divide-y divide-stone/40">
                {provs.map((p) => {
                  const pr = p.proveedores as { id: string; empresa: string; contacto: string | null; telefono: string | null; email: string | null; categorias_proveedor: { nombre: string } | null } | null;
                  return (
                    <div key={p.id} className="grid grid-cols-1 items-center gap-2 px-5 py-2.5 md:grid-cols-[1.2fr_1.4fr_auto_auto]">
                      <div><Link href={`/proveedores/${pr?.id}`} className="text-sm font-medium hover:text-olive">{pr?.empresa}</Link>
                        <p className="text-[11px] text-espresso/50">{[pr?.categorias_proveedor?.nombre, pr?.contacto, pr?.telefono, pr?.email].filter(Boolean).join(" · ")}</p></div>
                      <form action={guardar} className="flex gap-2">
                        <Ocultos v={{ _tabla: "evento_proveedores", _id: p.id, _volver: volver }} />
                        <input name="servicio" defaultValue={p.servicio ?? ""} disabled={!editar} placeholder="Servicio" className={`${campo} py-1.5`} />
                        <Sel name="estado" valor={p.estado} ops={["pendiente", "confirmado", "pagado"]} className={`${campo} w-32 py-1.5`} />
                        {editar && <button className={botonMini}>✓</button>}
                      </form>
                      {importes ? (
                        <form action={guardar} className="flex gap-1">
                          <Ocultos v={{ _tabla: "evento_proveedores_costes", _volver: volver, evento_proveedor_id: p.id }} />
                          <input name="coste" type="number" step="0.01" defaultValue={costeDe.get(p.id) ?? ""} disabled={!editar} placeholder="Coste" className={`${campo} w-28 py-1.5`} />
                          {editar && <button className={botonMini} title="Guardar coste">€</button>}
                        </form>
                      ) : <span />}
                      {editar ? <form action={borrar} data-confirmar><Ocultos v={{ _tabla: "evento_proveedores", _id: p.id, _volver: volver }} /><button className={quitar}>×</button></form> : <span />}
                    </div>
                  );
                })}
              </div>
            ) : <Vacio>Sin proveedores asignados.</Vacio>}
            {editar && (
              <form action={guardar} className="grid grid-cols-2 gap-2 border-t border-stone/60 bg-cream/40 px-5 py-3 md:grid-cols-[1.3fr_1fr_auto]">
                <Ocultos v={{ _tabla: "evento_proveedores", _volver: volver, evento_id: id }} />
                <Sel name="proveedor_id" ops={(proveedores ?? []).map((p) => ({ id: p.id, nombre: p.empresa }))} />
                <input name="servicio" placeholder="Servicio" className={campo} />
                <button className={botonMini}>Añadir</button>
              </form>
            )}
          </Tarjeta>

          <Tarjeta titulo="Timeline del día">
            {timeline?.length ? (
              <ol className="mb-4 space-y-2">
                {timeline.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 text-sm">
                    <span className="w-24 shrink-0 font-medium text-olive">{fFechaHora(t.momento)}</span>
                    <span className="flex-1">{t.descripcion}{t.responsable && <span className="text-espresso/50"> · {t.responsable}</span>}</span>
                    {editar && <form action={borrar} data-confirmar><Ocultos v={{ _tabla: "evento_timeline", _id: t.id, _volver: volver }} /><button className={quitar}>×</button></form>}
                  </li>
                ))}
              </ol>
            ) : <Vacio>Montaje, llegada de proveedores, apertura, cierre, desmontaje…</Vacio>}
            {editar && (
              <form action={guardar} className="grid grid-cols-2 gap-2 md:grid-cols-[12rem_1fr_9rem_auto]">
                <Ocultos v={{ _tabla: "evento_timeline", _volver: volver, evento_id: id }} />
                <input name="momento" type="datetime-local" required defaultValue={`${e.fecha}T09:00`} className={campo} />
                <input name="descripcion" required placeholder="Qué ocurre" className={campo} />
                <input name="responsable" placeholder="Quién" className={campo} />
                <button className={botonMini}>Añadir</button>
              </form>
            )}
          </Tarjeta>

          <Tarjeta titulo="Contenido y comunicación">
            {conts?.length ? (
              <div className="mb-4 divide-y divide-stone/40">
                {conts.map((c) => (
                  <form key={c.id} action={guardar} className="grid grid-cols-2 items-center gap-2 py-2 md:grid-cols-[7rem_1fr_9rem_1fr_auto]">
                    <Ocultos v={{ _tabla: "contenidos", _id: c.id, _volver: volver }} />
                    <span className="text-sm font-medium capitalize">{c.tipo}</span>
                    <input name="necesidad" defaultValue={c.necesidad ?? ""} disabled={!contenidoEditar} className={`${campo} py-1.5`} />
                    <Sel name="estado" valor={c.estado} ops={EST_CONT.map((x) => ({ id: x, nombre: EST_CONT_T[x] }))} className={`${campo} py-1.5`} />
                    <input name="enlace" defaultValue={c.enlace ?? ""} placeholder="Enlace a fotos/vídeo" disabled={!contenidoEditar} className={`${campo} py-1.5`} />
                    {contenidoEditar && <button className={botonMini}>✓</button>}
                  </form>
                ))}
              </div>
            ) : <Vacio>Define qué contenido hay que producir: fotos, vídeo, reels, nota de prensa…</Vacio>}
            {contenidoEditar && (
              <form action={guardar} className="grid grid-cols-2 gap-2 md:grid-cols-[9rem_1fr_auto]">
                <Ocultos v={{ _tabla: "contenidos", _volver: volver, evento_id: id }} />
                <Sel name="tipo" ops={["foto", "video", "reel", "post", "stories", "prensa"]} />
                <input name="necesidad" placeholder="Qué se necesita" className={campo} />
                <button className={botonMini}>Añadir</button>
              </form>
            )}
          </Tarjeta>

          <TareasDe tipo="evento" id={id} volver={volver} editar={puede(s, "tareas", "crear")} />
          <Comentarios tipo="evento" id={id} volver={volver} />
        </div>

        <div className="space-y-4">
          <Tarjeta titulo="Ficha del evento">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "eventos", _id: id, _volver: volver }} />
              <fieldset disabled={!editar} className="space-y-3">
                <Campo t="Nombre"><input name="nombre" required defaultValue={e.nombre} className={campo} /></Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo t="Fecha"><input name="fecha" type="date" required defaultValue={e.fecha} className={campo} /></Campo>
                  <Campo t="Aforo"><input name="aforo" type="number" defaultValue={e.aforo ?? ""} className={campo} /></Campo>
                  <Campo t="Hora inicio"><input name="hora_inicio" type="time" defaultValue={e.hora_inicio?.slice(0, 5) ?? ""} className={campo} /></Campo>
                  <Campo t="Hora fin"><input name="hora_fin" type="time" defaultValue={e.hora_fin?.slice(0, 5) ?? ""} className={campo} /></Campo>
                </div>
                <Campo t="Inicio montaje"><input name="montaje_inicio" type="datetime-local" defaultValue={isoAInput(e.montaje_inicio)} className={campo} /></Campo>
                <Campo t="Fin desmontaje"><input name="desmontaje_fin" type="datetime-local" defaultValue={isoAInput(e.desmontaje_fin)} className={campo} /></Campo>
                <Campo t="Responsable"><Sel name="responsable_id" valor={e.responsable_id} ops={perfiles ?? []} vacio="—" /></Campo>
                <Campo t="Cliente"><Sel name="cliente_id" valor={e.cliente_id} ops={clientes ?? []} vacio="—" /></Campo>
                <Campo t="Formato propio"><Sel name="formato_id" valor={e.formato_id} ops={formatos ?? []} vacio="—" /></Campo>
                <Campo t="Categoría"><Sel name="categoria_id" valor={e.categoria_id} ops={categorias ?? []} vacio="—" /></Campo>
                <Campo t="Notas internas"><textarea name="notas_internas" rows={4} defaultValue={e.notas_internas ?? ""} className={campo} /></Campo>
                {editar && <button className={`${boton} w-full`}>Guardar ficha</button>}
              </fieldset>
            </form>
            <div className="mt-4 border-t border-stone/50 pt-4">
              <p className="mb-2 text-xs text-espresso/60">Espacios</p>
              <Espacios tabla="evento_espacios" col="evento_id" id={id} volver={volver} editar={editar} />
            </div>
          </Tarjeta>

          <Tarjeta titulo="Incidencias">
            {incid?.length ? (
              <ul className="mb-4 space-y-2">
                {incid.map((i) => (
                  <li key={i.id} className={`flex items-start gap-2 text-sm ${i.resuelta ? "text-espresso/45 line-through" : ""}`}>
                    <form action={guardar}>
                      <Ocultos v={{ _tabla: "incidencias", _id: i.id, _volver: volver, _b: "resuelta" }} />
                      {!i.resuelta && <input type="hidden" name="resuelta" value="on" />}
                      <button disabled={!editar} className={`mt-0.5 grid h-4 w-4 place-items-center rounded border text-[10px] ${i.resuelta ? "border-olive bg-olive text-cream" : "border-bronze"}`}>{i.resuelta ? "✓" : ""}</button>
                    </form>
                    <span className="flex-1">{i.descripcion}</span>
                    <Insignia tono={i.gravedad === "urgente" || i.gravedad === "alta" ? "bronze" : "apagado"}>{i.gravedad}</Insignia>
                  </li>
                ))}
              </ul>
            ) : <Vacio>Sin incidencias.</Vacio>}
            {editar && (
              <form action={guardar} className="space-y-2">
                <Ocultos v={{ _tabla: "incidencias", _volver: volver, evento_id: id }} />
                <input name="descripcion" required placeholder="Describe la incidencia" className={campo} />
                <div className="flex gap-2"><Sel name="gravedad" valor="media" ops={PRIORIDADES} /><button className={botonMini}>Añadir</button></div>
              </form>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
