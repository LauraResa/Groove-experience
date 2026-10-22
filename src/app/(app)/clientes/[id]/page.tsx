import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { eur, fFecha } from "@/lib/fechas";
import { EST_EVENTO, EST_PROPUESTA, TIPOS_CLIENTE } from "@/lib/estados";
import { Aviso, Cabecera, Campo, Check, Insignia, Kpi, Ocultos, Sel, Tarjeta, Vacio, boton, botonMini, campo } from "@/components/ui";
import { Comentarios } from "@/components/Comentarios";
import { DocumentosDe } from "@/components/Documentos";

export default async function Cliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "clientes")) notFound();
  const editar = puede(s, "clientes", "editar");
  const importes = puede(s, "clientes", "ver_importes");
  const supabase = await createClient();
  const volver = `/clientes/${id}`;

  const { data: c } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: contactos }, { data: leads }, { data: eventos }, { data: props }] = await Promise.all([
    supabase.from("contactos").select("*").eq("cliente_id", id).order("principal", { ascending: false }),
    supabase.from("leads").select("id, codigo, titulo, fecha_prevista, presupuesto_estimado, estados_lead(nombre, es_ganado, es_perdido)").eq("cliente_id", id).order("creado_en", { ascending: false }),
    supabase.from("eventos").select("id, nombre, fecha, estado, evento_finanzas(facturacion, extras)").eq("cliente_id", id).order("fecha", { ascending: false }),
    supabase.from("propuestas").select("id, codigo, version, titulo, estado, leads!inner(cliente_id)").eq("leads.cliente_id", id).order("creado_en", { ascending: false }),
  ]);
  const fact = (eventos ?? []).reduce((a, e) => { const f = e.evento_finanzas as unknown as { facturacion: number; extras: number } | null; return a + Number(f?.facturacion ?? 0) + Number(f?.extras ?? 0); }, 0);
  const abiertos = (leads ?? []).filter((l) => { const e = l.estados_lead as unknown as { es_ganado: boolean; es_perdido: boolean } | null; return !e?.es_ganado && !e?.es_perdido; });

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera volver={{ href: "/clientes", txt: "Clientes" }} ante={c.tipo} titulo={c.nombre} sub={[c.sector, c.web].filter(Boolean).join(" · ") || undefined} />
      <Aviso error={error} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi destacado icono="eventos" label="Eventos realizados" valor={(eventos ?? []).length} />
        {importes && <Kpi icono="finanzas" label="Facturación total" valor={eur(fact)} sub={eventos?.length ? `Ticket medio ${eur(fact / eventos.length)}` : undefined} />}
        <Kpi icono="leads" label="Oportunidades abiertas" valor={abiertos.length} />
        <Kpi icono="propuestas" label="Propuestas" valor={(props ?? []).length} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tarjeta titulo="Contactos">
            <div className="divide-y divide-stone/40">
              {(contactos ?? []).map((k) => (
                <form key={k.id} action={guardar} className="grid grid-cols-2 items-center gap-2 py-2 md:grid-cols-[1fr_1fr_1.2fr_1fr_auto_auto]">
                  <Ocultos v={{ _tabla: "contactos", _id: k.id, _volver: volver }} />
                  <input name="nombre" defaultValue={k.nombre} disabled={!editar} className={`${campo} py-1.5`} />
                  <input name="cargo" defaultValue={k.cargo ?? ""} placeholder="Cargo" disabled={!editar} className={`${campo} py-1.5`} />
                  <input name="email" defaultValue={k.email ?? ""} placeholder="Email" disabled={!editar} className={`${campo} py-1.5`} />
                  <input name="telefono" defaultValue={k.telefono ?? ""} placeholder="Teléfono" disabled={!editar} className={`${campo} py-1.5`} />
                  <Check name="principal" t="Principal" valor={k.principal} />
                  {editar && <div className="flex gap-1"><button className={botonMini}>✓</button><button formAction={borrar} className="rounded-md border border-stone px-2 py-1 text-xs text-espresso/55 hover:text-red-800">×</button></div>}
                </form>
              ))}
            </div>
            {!contactos?.length && <Vacio>Sin contactos.</Vacio>}
            {editar && (
              <form action={guardar} className="mt-3 grid grid-cols-2 gap-2 border-t border-stone/50 pt-3 md:grid-cols-[1fr_1fr_1.2fr_1fr_auto]">
                <Ocultos v={{ _tabla: "contactos", _volver: volver, cliente_id: id }} />
                <input name="nombre" required placeholder="Nombre" className={campo} />
                <input name="cargo" placeholder="Cargo" className={campo} />
                <input name="email" type="email" placeholder="Email" className={campo} />
                <input name="telefono" placeholder="Teléfono" className={campo} />
                <button className={botonMini}>Añadir</button>
              </form>
            )}
          </Tarjeta>

          <div className="grid gap-4 md:grid-cols-2">
            <Tarjeta titulo="Leads y oportunidades">
              {leads?.length ? <ul className="space-y-2 text-sm">{leads.map((l) => (
                <li key={l.id} className="flex justify-between gap-2"><Link href={`/leads/${l.id}`} className="truncate hover:text-olive">{l.titulo}</Link>
                  <Insignia tono="apagado">{(l.estados_lead as unknown as { nombre: string } | null)?.nombre}</Insignia></li>))}</ul> : <Vacio>Sin leads.</Vacio>}
            </Tarjeta>
            <Tarjeta titulo="Propuestas">
              {props?.length ? <ul className="space-y-2 text-sm">{props.map((p) => (
                <li key={p.id} className="flex justify-between gap-2"><Link href={`/propuestas/${p.id}`} className="truncate hover:text-olive">{p.codigo} · {p.titulo}</Link>
                  <Insignia tono={EST_PROPUESTA[p.estado]?.tono}>{EST_PROPUESTA[p.estado]?.t}</Insignia></li>))}</ul> : <Vacio>Sin propuestas.</Vacio>}
            </Tarjeta>
          </div>

          <Tarjeta titulo="Histórico de eventos" sinPadding>
            {eventos?.length ? (
              <table className="w-full text-sm"><tbody>
                {eventos.map((e) => { const f = e.evento_finanzas as unknown as { facturacion: number; extras: number } | null; return (
                  <tr key={e.id} className="border-t border-stone/40 first:border-t-0">
                    <td className="px-5 py-2.5 whitespace-nowrap text-espresso/60">{fFecha(e.fecha)}</td>
                    <td className="px-5 py-2.5"><Link href={`/eventos/${e.id}`} className="hover:text-olive">{e.nombre}</Link></td>
                    <td className="px-5 py-2.5"><Insignia tono={EST_EVENTO[e.estado]?.tono}>{EST_EVENTO[e.estado]?.t}</Insignia></td>
                    {importes && <td className="px-5 py-2.5 text-right">{f ? eur(Number(f.facturacion) + Number(f.extras)) : "—"}</td>}
                  </tr>); })}
              </tbody></table>
            ) : <Vacio>Todavía no hay eventos con este cliente.</Vacio>}
          </Tarjeta>
          <Comentarios tipo="cliente" id={id} volver={volver} />
        </div>

        <div className="space-y-4">
          <Tarjeta titulo="Datos">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "clientes", _id: id, _volver: volver }} />
              <fieldset disabled={!editar} className="space-y-3">
                <Campo t="Nombre"><input name="nombre" required defaultValue={c.nombre} className={campo} /></Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo t="Tipo"><Sel name="tipo" valor={c.tipo} ops={TIPOS_CLIENTE} /></Campo>
                  <Campo t="Sector"><input name="sector" defaultValue={c.sector ?? ""} className={campo} /></Campo>
                  <Campo t="CIF"><input name="cif" defaultValue={c.cif ?? ""} className={campo} /></Campo>
                  <Campo t="Web"><input name="web" defaultValue={c.web ?? ""} className={campo} /></Campo>
                </div>
                <Campo t="Preferencias"><textarea name="preferencias" rows={3} defaultValue={c.preferencias ?? ""} placeholder="Gustos, alergias, estilo, proveedores preferidos…" className={campo} /></Campo>
                <Campo t="Notas"><textarea name="notas" rows={3} defaultValue={c.notas ?? ""} className={campo} /></Campo>
                {editar && <button className={`${boton} w-full`}>Guardar</button>}
              </fieldset>
            </form>
          </Tarjeta>
          <DocumentosDe tipo="cliente" id={id} volver={volver} />
        </div>
      </div>
    </div>
  );
}
