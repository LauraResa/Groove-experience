import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { eur, fFecha, fFechaHora } from "@/lib/fechas";
import { BLOQUES, EST_PROPUESTA } from "@/lib/estados";
import { Aviso, Cabecera, Campo, Insignia, Kpi, Ocultos, Sel, Tarjeta, Vacio, boton, botonMini, botonSec, campo } from "@/components/ui";
import { Comentarios } from "@/components/Comentarios";
import { Espacios } from "@/components/Espacios";
import { aprobacionVigente } from "@/lib/propuestas";
import { anadirLinea, cambiarEstado, convertirEnEvento, decidirAprobacion, enviarPropuesta, nuevaVersion } from "../actions";

export default async function Propuesta({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "propuestas")) notFound();
  const editar = puede(s, "propuestas", "editar");
  const importes = puede(s, "propuestas", "ver_importes");
  const aprobar = puede(s, "aprobaciones", "aprobar");
  const supabase = await createClient();

  const { data: p } = await supabase.from("propuestas").select("*, leads(id, titulo, clientes(id, nombre))").eq("id", id).maybeSingle();
  if (!p) notFound();
  const volver = `/propuestas/${id}`;

  const [{ data: lineas }, { data: tot }, { data: aprobs }, { data: catalogo }, { data: proveedores }, { data: perfiles }, { data: evento }] = await Promise.all([
    supabase.from("propuesta_lineas").select("*, proveedores(empresa)").eq("propuesta_id", id).order("orden").order("id"),
    supabase.from("propuesta_totales").select("*").eq("propuesta_id", id).maybeSingle(),
    supabase.from("aprobaciones").select("*, solicitante:perfiles!aprobaciones_solicitada_por_fkey(nombre), decisor:perfiles!aprobaciones_decidida_por_fkey(nombre)").eq("entidad_tipo", "propuesta").eq("entidad_id", id).order("solicitada_en", { ascending: false }),
    supabase.from("catalogo_items").select("id, nombre, bloque, precio, unidad, proveedores(empresa)").eq("activo", true).order("nombre"),
    supabase.from("proveedores").select("id, empresa").order("empresa"),
    supabase.from("perfiles").select("id, nombre, roles(clave)"),
    supabase.from("eventos").select("id, nombre").eq("propuesta_id", id).maybeSingle(),
  ]);

  const lead = p.leads as { id: string; titulo: string; clientes: { id: string; nombre: string } | null } | null;
  const est = EST_PROPUESTA[p.estado];
  const total = Number(tot?.total ?? 0);
  const margenPct = total ? Math.round((Number(tot?.margen ?? 0) / total) * 100) : 0;
  const ultAprob = aprobs?.[0];
  const [vig, { data: validadas }] = await Promise.all([
    aprobacionVigente(supabase, id),
    supabase.from("condiciones_estandar").select("valor").eq("regla", "condiciones_validadas").maybeSingle(),
  ]);
  const provisionales = Number(validadas?.valor ?? 0) !== 1;
  const responsables = (perfiles ?? []).filter((x) => (x.roles as unknown as { clave: string } | null)?.clave === "admin_tge");
  const cerrada = ["aceptada", "rechazada", "caducada"].includes(p.estado);
  const porBloque = Object.keys(BLOQUES).map((b) => ({ b, ls: (lineas ?? []).filter((l) => l.bloque === b) })).filter((x) => x.ls.length);

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera volver={{ href: "/propuestas", txt: "Propuestas" }} ante={`${p.codigo} · versión ${p.version}`} titulo={p.titulo}
        sub={<>{lead?.clientes?.nombre ?? "Sin cliente"} · <Link href={`/leads/${lead?.id}`} className="text-olive hover:text-bronze">ver lead</Link></>}>
        <Insignia tono={est?.tono}>{est?.t}</Insignia>
      </Cabecera>
      <Aviso error={error} />
      {vig.cambiada && !cerradaAntes(p.estado) && (
        <p className="tarjeta border-bronze/60 px-4 py-3 text-sm text-bronze">La propuesta ha cambiado después de que Groove la aprobara. Para enviarla o aceptarla hay que solicitar una nueva aprobación.</p>
      )}

      {editar && (
        <div className="tarjeta aparecer flex flex-wrap items-center gap-2 p-3">
          {["borrador", "aprobada", "pendiente_aprobacion"].includes(p.estado) && (
            <form action={enviarPropuesta}>
              <input type="hidden" name="id" value={id} />
              <button className={boton} disabled={p.estado === "pendiente_aprobacion" && ultAprob?.estado === "pendiente"}>
                {!vig.ok ? (ultAprob?.estado === "pendiente" ? "Esperando aprobación de Groove…" : vig.cambiada ? "Solicitar nueva aprobación" : "Solicitar aprobación a Groove") : "Marcar como enviada al cliente"}
              </button>
            </form>
          )}
          {p.estado === "enviada" && <EstadoBtn id={id} estado="negociacion" t="En negociación" />}
          {["enviada", "negociacion", "aprobada"].includes(p.estado) && vig.ok && <EstadoBtn id={id} estado="aceptada" t="✓ Aceptada por el cliente" fuerte />}
          {["enviada", "negociacion"].includes(p.estado) && <EstadoBtn id={id} estado="rechazada" t="Rechazada" />}
          {p.estado === "aceptada" && (evento
            ? <Link href={`/eventos/${evento.id}`} className={boton}>Ver evento →</Link>
            : <form action={convertirEnEvento}><input type="hidden" name="id" value={id} /><button className={boton}>Convertir en evento</button></form>)}
          {!cerrada && <form action={nuevaVersion} className="ml-auto"><input type="hidden" name="id" value={id} /><button className={botonSec}>Nueva versión</button></form>}
        </div>
      )}

      {importes && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi destacado label="Total" valor={eur(total)} sub={Number(p.descuento_pct) ? `Descuento ${p.descuento_pct} % incluido` : "Sin descuento"} />
          <Kpi label="Coste" valor={eur(tot?.coste)} />
          <Kpi label="Margen" valor={`${margenPct} %`} sub={eur(tot?.margen)} />
          <Kpi label="Precio por persona" valor={p.asistentes ? eur(total / p.asistentes) : "—"} sub={p.asistentes ? `${p.asistentes} asistentes` : "Indica asistentes"} />
        </section>
      )}

      {(p.requiere_aprobacion || (aprobs?.length ?? 0) > 0) && (
        <Tarjeta titulo="Aprobación de Groove" className={ultAprob?.estado === "pendiente" ? "border-bronze/60" : ""}>
          {provisionales && <p className="mb-3 text-xs text-bronze">Condiciones estándar provisionales, pendientes de validar con Groove.</p>}
          {p.requiere_aprobacion && (
            <div className="mb-4 flex flex-wrap gap-2">
              {(p.motivos_aprobacion ?? []).map((m: string) => <Insignia key={m} tono="bronze">{m}</Insignia>)}
            </div>
          )}
          {aprobs?.length ? (
            <ul className="space-y-3">
              {aprobs.map((a) => (
                <li key={a.id} className="rounded-xl border border-stone/50 bg-cream/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Solicitada por {(a.solicitante as { nombre: string } | null)?.nombre ?? "—"} · {fFechaHora(a.solicitada_en)}</span>
                    <Insignia tono={a.estado === "aprobada" ? "olive" : a.estado === "rechazada" ? "apagado" : "bronze"}>{a.estado}</Insignia>
                  </div>
                  <p className="mt-1 text-espresso/70">{a.motivo}</p>
                  {a.decidida_en && <p className="mt-1 text-xs text-espresso/55">{(a.decisor as { nombre: string } | null)?.nombre} · {fFechaHora(a.decidida_en)}{a.comentario && ` — «${a.comentario}»`}</p>}
                  {a.estado === "pendiente" && aprobar && (
                    <form action={decidirAprobacion} className="mt-3 flex flex-wrap gap-2">
                      <Ocultos v={{ aprobacion_id: a.id, propuesta_id: id }} />
                      <input name="comentario" placeholder="Comentario (opcional)" className={`${campo} flex-1 min-w-48`} />
                      <button name="decision" value="aprobada" className={boton}>Aprobar</button>
                      <button name="decision" value="rechazada" className={botonSec}>Rechazar</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-espresso/60">Esta propuesta está fuera de condiciones estándar. Al enviarla se pedirá aprobación a Rubén / Richy.</p>}
        </Tarjeta>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tarjeta titulo="Servicios y precios" sinPadding>
            {porBloque.length ? porBloque.map(({ b, ls }) => (
              <div key={b} className="border-b border-stone/40 last:border-b-0">
                <p className="bg-stone/20 px-5 py-2 text-[10px] uppercase tracking-[0.15em] text-espresso/60">{BLOQUES[b]}</p>
                {ls.map((l) => (
                  <form key={l.id} action={guardar} className="grid grid-cols-6 items-center gap-2 px-5 py-2 md:grid-cols-[1fr_5rem_6.5rem_6.5rem_6.5rem_auto]">
                    <Ocultos v={{ _tabla: "propuesta_lineas", _id: l.id, _volver: volver }} />
                    <div className="col-span-6 md:col-span-1">
                      <input name="descripcion" defaultValue={l.descripcion} disabled={!editar || cerrada} className={`${campo} py-1.5`} />
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 px-1 text-[11px] text-espresso/50">
                        {(l.proveedores as { empresa: string } | null) && <span>{(l.proveedores as { empresa: string }).empresa}</span>}
                        <label className={`inline-flex items-center gap-1 ${l.extraordinario ? "text-bronze" : ""}`} title="Marca esta opción solo si este concepto supone un gasto o inversión especial fuera de la operativa habitual y debe ser revisado por Groove.">
                          <input type="hidden" name="_b" value="extraordinario" />
                          <input type="checkbox" name="extraordinario" defaultChecked={l.extraordinario} disabled={!editar || cerrada} className="accent-bronze" />
                          Extraordinario
                        </label>
                      </div>
                    </div>
                    <input name="cantidad" type="number" step="0.01" defaultValue={l.cantidad} title="Cantidad" disabled={!editar || cerrada} className={`${campo} py-1.5`} />
                    {importes && <input name="precio_unitario" type="number" step="0.01" defaultValue={l.precio_unitario} title="Precio unitario" disabled={!editar || cerrada} className={`${campo} py-1.5`} />}
                    {importes && <input name="coste_unitario" type="number" step="0.01" defaultValue={l.coste_unitario} title="Coste unitario" disabled={!editar || cerrada} className={`${campo} py-1.5`} />}
                    {importes && <p className="text-right text-sm font-medium">{eur(Number(l.cantidad) * Number(l.precio_unitario))}</p>}
                    {editar && !cerrada && (
                      <div className="flex gap-1 justify-end">
                        <button className={botonMini} title="Guardar">✓</button>
                        <button formAction={borrar} className="rounded-md border border-stone px-2 py-1 text-xs text-espresso/55 hover:border-red-800 hover:text-red-800" title="Quitar">×</button>
                      </div>
                    )}
                  </form>
                ))}
              </div>
            )) : <Vacio>Añade servicios desde el catálogo o a mano.</Vacio>}
            {importes && porBloque.length > 0 && (
              <div className="flex justify-end gap-6 border-t border-stone/60 px-5 py-3 text-sm">
                <span>Subtotal <b>{eur(tot?.subtotal)}</b></span>
                {Number(p.descuento_pct) > 0 && <span className="text-bronze">−{p.descuento_pct} %</span>}
                <span>Total <b className="font-serif text-lg">{eur(total)}</b></span>
              </div>
            )}
            {editar && !cerrada && (
              <form action={anadirLinea} className="grid grid-cols-2 gap-2 border-t border-stone/60 bg-cream/40 px-5 py-4 md:grid-cols-6">
                <input type="hidden" name="propuesta_id" value={id} />
                <select name="catalogo_item_id" defaultValue="" className={`${campo} col-span-2 md:col-span-3`}>
                  <option value="">— Desde el catálogo (opcional) —</option>
                  {(catalogo ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}{(c.proveedores as unknown as { empresa: string } | null) ? ` · ${(c.proveedores as unknown as { empresa: string }).empresa}` : ""}{importes && c.precio ? ` · ${eur(c.precio)}/${c.unidad}` : ""}</option>)}
                </select>
                <Sel name="bloque" ops={Object.entries(BLOQUES).map(([k, v]) => ({ id: k, nombre: v }))} vacio="Bloque" className={campo} />
                <select name="proveedor_id" defaultValue="" className={`${campo} md:col-span-2`}>
                  <option value="">Proveedor</option>
                  {(proveedores ?? []).map((x) => <option key={x.id} value={x.id}>{x.empresa}</option>)}
                </select>
                <input name="descripcion" placeholder="Concepto (si no es del catálogo)" className={`${campo} col-span-2 md:col-span-3`} />
                <input name="cantidad" type="number" step="0.01" placeholder="Cant." defaultValue={p.asistentes ?? 1} className={campo} />
                {importes && <input name="precio_unitario" type="number" step="0.01" placeholder="Precio ud." className={campo} />}
                {importes && <input name="coste_unitario" type="number" step="0.01" placeholder="Coste ud." className={campo} />}
                <label className="col-span-2 flex items-start gap-1.5 text-xs text-espresso/65 md:col-span-3">
                  <input type="checkbox" name="extraordinario" className="mt-0.5 accent-bronze" />
                  <span><b className="font-medium text-espresso">Extraordinario.</b> Marca esta opción solo si este concepto supone un gasto o inversión especial fuera de la operativa habitual y debe ser revisado por Groove.</span>
                </label>
                <button className={`${boton} col-span-2 md:col-span-3 md:justify-self-end`}>Añadir servicio</button>
              </form>
            )}
          </Tarjeta>
          <Comentarios tipo="propuesta" id={id} volver={volver} />
        </div>

        <Tarjeta titulo="Datos de la propuesta">
          <form action={guardar} className="space-y-3">
            <Ocultos v={{ _tabla: "propuestas", _id: id, _volver: volver }} />
            <fieldset disabled={!editar || cerrada} className="space-y-3">
              <Campo t="Título"><input name="titulo" required defaultValue={p.titulo} className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Fecha del evento"><input name="fecha_evento" type="date" defaultValue={p.fecha_evento ?? ""} className={campo} /></Campo>
                <Campo t="Asistentes"><input name="asistentes" type="number" min="0" defaultValue={p.asistentes ?? ""} className={campo} /></Campo>
                {importes && <Campo t="Descuento %"><input name="descuento_pct" type="number" step="0.01" min="0" max="100" defaultValue={p.descuento_pct} className={campo} /></Campo>}
                <Campo t="Válida hasta"><input name="fecha_validez" type="date" defaultValue={p.fecha_validez ?? ""} className={campo} /></Campo>
              </div>
              <Campo t="Responsable"><Sel name="responsable_id" ops={responsables} valor={p.responsable_id} vacio="—" /></Campo>
              <Campo t="Condiciones"><textarea name="condiciones" rows={5} defaultValue={p.condiciones ?? ""} placeholder="Forma de pago, señal, cancelación, horarios…" className={campo} /></Campo>
              {editar && !cerrada && <button className={`${boton} w-full`}>Guardar datos</button>}
            </fieldset>
          </form>
          <div className="mt-5 border-t border-stone/50 pt-4">
            <p className="mb-2 text-xs text-espresso/60">Espacios</p>
            <Espacios tabla="propuesta_espacios" col="propuesta_id" id={id} volver={volver} editar={editar && !cerrada} />
          </div>
          {p.fecha_envio && <p className="mt-4 text-xs text-espresso/55">Enviada el {fFecha(p.fecha_envio)}</p>}
        </Tarjeta>
      </div>
    </div>
  );
}

function EstadoBtn({ id, estado, t, fuerte }: { id: string; estado: string; t: string; fuerte?: boolean }) {
  return (
    <form action={cambiarEstado}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="estado" value={estado} />
      <button className={fuerte ? boton : botonSec}>{t}</button>
    </form>
  );
}

const cerradaAntes = (estado: string) => ["aceptada", "rechazada", "caducada"].includes(estado);
