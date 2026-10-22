"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hoyMadrid } from "@/lib/fechas";

type SB = Awaited<ReturnType<typeof createClient>>;
const txt = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : v; };

async function estadoLead(supabase: SB, leadId: string, nombre: string) {
  const { data } = await supabase.from("estados_lead").select("id").eq("nombre", nombre).maybeSingle();
  if (data) await supabase.from("leads").update({ estado_id: data.id }).eq("id", leadId);
}

const refrescar = (id: string) => { revalidatePath(`/propuestas/${id}`); revalidatePath("/propuestas"); revalidatePath("/leads"); revalidatePath("/"); };

export async function crearPropuesta(f: FormData) {
  const leadId = String(f.get("lead_id"));
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("titulo, fecha_prevista, asistentes, responsable_id").eq("id", leadId).single();
  const { data: ult } = await supabase.from("propuestas").select("version").eq("lead_id", leadId).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from("propuestas").insert({
    lead_id: leadId, version: (ult?.version ?? 0) + 1, titulo: lead?.titulo ?? "Propuesta",
    fecha_evento: lead?.fecha_prevista, asistentes: lead?.asistentes, responsable_id: lead?.responsable_id,
  }).select("id").single();
  if (error || !data) redirect(`/leads/${leadId}?error=${encodeURIComponent(error?.message ?? "Error")}`);
  await estadoLead(supabase, leadId, "Propuesta en preparación");
  redirect(`/propuestas/${data.id}`);
}

export async function anadirLinea(f: FormData) {
  const propuestaId = String(f.get("propuesta_id"));
  const supabase = await createClient();
  const itemId = txt(f, "catalogo_item_id");
  let item: { nombre: string; precio: number | null; coste: number | null; proveedor_id: string | null; bloque: string } | null = null;
  if (itemId) ({ data: item } = await supabase.from("catalogo_items").select("nombre, precio, coste, proveedor_id, bloque").eq("id", itemId).maybeSingle());
  const n = (k: string, def: number | null | undefined) => (txt(f, k) ? Number(String(f.get(k)).replace(",", ".")) : Number(def ?? 0));
  await supabase.from("propuesta_lineas").insert({
    propuesta_id: propuestaId,
    bloque: txt(f, "bloque") ?? item?.bloque ?? "extras",
    catalogo_item_id: itemId,
    proveedor_id: txt(f, "proveedor_id") ?? item?.proveedor_id ?? null,
    descripcion: txt(f, "descripcion") ?? item?.nombre ?? "Concepto",
    cantidad: n("cantidad", 1),
    precio_unitario: n("precio_unitario", item?.precio),
    coste_unitario: n("coste_unitario", item?.coste),
  });
  refrescar(propuestaId);
}

export async function enviarPropuesta(f: FormData) {
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { data: p } = await supabase.from("propuestas").select("lead_id, asistentes, requiere_aprobacion, motivos_aprobacion").eq("id", id).single();
  if (!p) return;
  const { data: tot } = await supabase.from("propuesta_totales").select("total").eq("propuesta_id", id).maybeSingle();
  const { data: minPax } = await supabase.from("condiciones_estandar").select("valor").eq("regla", "precio_min_pax").eq("activa", true).maybeSingle();

  const motivos = [...(p.motivos_aprobacion ?? [])];
  if (minPax && p.asistentes && tot?.total && Number(tot.total) / p.asistentes < Number(minPax.valor)) motivos.push("Precio por persona inferior al mínimo");

  if (motivos.length) {
    const { data: ap } = await supabase.from("aprobaciones").select("estado").eq("entidad_tipo", "propuesta").eq("entidad_id", id)
      .order("solicitada_en", { ascending: false }).limit(1).maybeSingle();
    if (ap?.estado !== "aprobada") {
      if (ap?.estado !== "pendiente") {
        await supabase.from("aprobaciones").insert({ entidad_tipo: "propuesta", entidad_id: id, motivo: motivos.join(" · "), detalle: txt(f, "detalle") });
      }
      await supabase.from("propuestas").update({ estado: "pendiente_aprobacion" }).eq("id", id);
      await estadoLead(supabase, p.lead_id, "Pendiente aprobación Groove");
      refrescar(id);
      return;
    }
  }
  await supabase.from("propuestas").update({ estado: "enviada", fecha_envio: hoyMadrid() }).eq("id", id);
  await estadoLead(supabase, p.lead_id, "Propuesta enviada");
  refrescar(id);
}

export async function cambiarEstado(f: FormData) {
  const id = String(f.get("id"));
  const estado = String(f.get("estado"));
  const supabase = await createClient();
  const { data: p } = await supabase.from("propuestas").select("lead_id").eq("id", id).single();
  await supabase.from("propuestas").update({ estado }).eq("id", id);
  if (p) {
    const mapa: Record<string, string> = { negociacion: "Negociación", aceptada: "Confirmado", rechazada: "Perdido" };
    if (mapa[estado]) await estadoLead(supabase, p.lead_id, mapa[estado]);
  }
  refrescar(id);
}

export async function decidirAprobacion(f: FormData) {
  const id = String(f.get("aprobacion_id"));
  const propuestaId = String(f.get("propuesta_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("aprobaciones").update({
    estado: String(f.get("decision")), comentario: txt(f, "comentario"), decidida_por: user?.id, decidida_en: new Date().toISOString(),
  }).eq("id", id);
  refrescar(propuestaId);
}

export async function nuevaVersion(f: FormData) {
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { data: p } = await supabase.from("propuestas").select("*").eq("id", id).single();
  if (!p) return;
  const { data: ult } = await supabase.from("propuestas").select("version").eq("lead_id", p.lead_id).order("version", { ascending: false }).limit(1).single();
  const { data: nueva } = await supabase.from("propuestas").insert({
    lead_id: p.lead_id, version: (ult?.version ?? p.version) + 1, titulo: p.titulo, fecha_evento: p.fecha_evento, asistentes: p.asistentes,
    descuento_pct: p.descuento_pct, condiciones: p.condiciones, responsable_id: p.responsable_id, fecha_validez: p.fecha_validez,
  }).select("id").single();
  if (!nueva) return;
  const { data: lineas } = await supabase.from("propuesta_lineas").select("bloque, catalogo_item_id, proveedor_id, descripcion, cantidad, precio_unitario, coste_unitario, orden").eq("propuesta_id", id);
  if (lineas?.length) await supabase.from("propuesta_lineas").insert(lineas.map((l) => ({ ...l, propuesta_id: nueva.id })));
  await supabase.from("propuestas").update({ estado: "caducada" }).eq("id", id).in("estado", ["borrador", "enviada", "negociacion", "aprobada", "pendiente_aprobacion"]);
  redirect(`/propuestas/${nueva.id}`);
}

export async function convertirEnEvento(f: FormData) {
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { data: existe } = await supabase.from("eventos").select("id").eq("propuesta_id", id).maybeSingle();
  if (existe) redirect(`/eventos/${existe.id}`);
  const { data: p } = await supabase.from("propuestas").select("*, leads(cliente_id, categoria_id)").eq("id", id).single();
  if (!p) return;
  const lead = p.leads as { cliente_id: string | null; categoria_id: string | null } | null;
  const { data: ev, error } = await supabase.from("eventos").insert({
    nombre: p.titulo, propuesta_id: id, lead_id: p.lead_id, cliente_id: lead?.cliente_id, categoria_id: lead?.categoria_id,
    fecha: p.fecha_evento ?? hoyMadrid(), aforo: p.asistentes, responsable_id: p.responsable_id, estado: "preproduccion",
  }).select("id").single();
  if (error || !ev) redirect(`/propuestas/${id}?error=${encodeURIComponent(error?.message ?? "Error")}`);

  const [{ data: tot }, { data: lineas }, { data: espacios }] = await Promise.all([
    supabase.from("propuesta_totales").select("total, coste").eq("propuesta_id", id).maybeSingle(),
    supabase.from("propuesta_lineas").select("proveedor_id, descripcion, cantidad, coste_unitario").eq("propuesta_id", id),
    supabase.from("propuesta_espacios").select("espacio_id").eq("propuesta_id", id),
  ]);
  await supabase.from("evento_finanzas").insert({ evento_id: ev.id, facturacion: tot?.total ?? 0, costes: tot?.coste ?? 0 });
  const conProv = (lineas ?? []).filter((l) => l.proveedor_id);
  if (conProv.length) await supabase.from("evento_proveedores").insert(conProv.map((l) => ({
    evento_id: ev.id, proveedor_id: l.proveedor_id, servicio: l.descripcion, coste: Number(l.cantidad) * Number(l.coste_unitario),
  })));
  if (espacios?.length) await supabase.from("evento_espacios").insert(espacios.map((e) => ({ evento_id: ev.id, espacio_id: e.espacio_id })));
  if (p.estado !== "aceptada") await supabase.from("propuestas").update({ estado: "aceptada" }).eq("id", id);
  await estadoLead(supabase, p.lead_id, "Confirmado");
  revalidatePath("/eventos");
  redirect(`/eventos/${ev.id}`);
}

export async function alternarEspacio(f: FormData) {
  const tabla = String(f.get("tabla")); // propuesta_espacios | evento_espacios | lead_espacios
  const col = { propuesta_espacios: "propuesta_id", evento_espacios: "evento_id", lead_espacios: "lead_id" }[tabla];
  if (!col) return;
  const id = String(f.get("id"));
  const espacio_id = String(f.get("espacio_id"));
  const supabase = await createClient();
  if (f.get("on") === "1") await supabase.from(tabla).delete().eq(col, id).eq("espacio_id", espacio_id);
  else await supabase.from(tabla).insert({ [col]: id, espacio_id });
  revalidatePath(String(f.get("_volver")));
}
