"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { madridAIso } from "@/lib/fechas";

type T = "t" | "n" | "d" | "h" | "ts" | "u" | "b";

const TABLAS: Record<string, Record<string, T>> = {
  clientes: { tipo: "t", nombre: "t", cif: "t", web: "t", sector: "t", preferencias: "t", notas: "t" },
  contactos: { cliente_id: "u", nombre: "t", cargo: "t", email: "t", telefono: "t", principal: "b" },
  proveedores: { categoria_id: "u", empresa: "t", contacto: "t", telefono: "t", email: "t", web: "t", servicios: "t", tipo: "t", valoracion: "n", notas: "t" },
  catalogo_items: { proveedor_id: "u", nombre: "t", bloque: "t", unidad: "t", precio: "n", coste: "n", condiciones: "t", vigente_desde: "d", vigente_hasta: "d", activo: "b" },
  propuestas: { titulo: "t", fecha_evento: "d", asistentes: "n", descuento_pct: "n", condiciones: "t", fecha_validez: "d", responsable_id: "u" },
  propuesta_lineas: { propuesta_id: "u", bloque: "t", catalogo_item_id: "u", proveedor_id: "u", descripcion: "t", cantidad: "n", precio_unitario: "n", coste_unitario: "n", extraordinario: "b" },
  eventos: { nombre: "t", cliente_id: "u", formato_id: "u", categoria_id: "u", fecha: "d", hora_inicio: "h", hora_fin: "h", montaje_inicio: "ts", desmontaje_fin: "ts", aforo: "n", responsable_id: "u", estado: "t", notas_internas: "t" },
  evento_proveedores: { evento_id: "u", proveedor_id: "u", servicio: "t", estado: "t", valoracion: "n" },
  evento_proveedores_costes: { evento_proveedor_id: "u", coste: "n" },
  proveedor_condiciones: { proveedor_id: "u", condiciones: "t" },
  evento_timeline: { evento_id: "u", momento: "ts", descripcion: "t", responsable: "t" },
  incidencias: { evento_id: "u", descripcion: "t", gravedad: "t", resuelta: "b" },
  contenidos: { evento_id: "u", formato_id: "u", tipo: "t", necesidad: "t", estado: "t", enlace: "t", responsable_id: "u" },
  formatos: { nombre: "t", padre_id: "u", categoria_id: "u", descripcion: "t", publico: "t", objetivo: "t", duracion: "t", aforo: "n", horario: "t", necesidades: "t", coste_estimado: "n", ingreso_potencial: "n", partners: "t", sponsors: "t", resultados: "t" },
  calendario_bloques: { tipo: "t", titulo: "t", inicio: "ts", fin: "ts", espacio_id: "u", notas: "t" },
  actividades: { lead_id: "u", tipo: "t", inicio: "ts", fin: "ts", descripcion: "t" },
  roadmap_items: { semana: "n", area: "t", objetivo: "t", titulo: "t", responsable_id: "u", colaborador_id: "u", depende_de_id: "u", fecha_inicio: "d", fecha_limite: "d", estado: "t", prioridad: "t", resultado_esperado: "t", comentarios: "t" },
  tareas: { titulo: "t", responsable_id: "u", fecha: "d", prioridad: "t", estado: "t", notas: "t", entidad_tipo: "t", entidad_id: "u" },
  documentos: { carpeta: "t", nombre: "t", url_externa: "t" },
  documento_vinculos: { documento_id: "u", entidad_tipo: "t", entidad_id: "u" },
  evento_finanzas: { evento_id: "u", facturacion: "n", costes: "n", extras: "n", reserva_groove: "n", variable_pct: "n", variable_confirmado: "n" },
  cobros: { evento_id: "u", fecha: "d", importe: "n", concepto: "t", cobrado: "b" },
  solicitudes: { canal: "t", origen: "t", remitente: "t", email: "t", telefono: "t", asunto: "t", cuerpo: "t", asignada_a: "u", estado: "t" },
};

function leer(f: FormData, campos: Record<string, T>) {
  const fila: Record<string, string | number | boolean | null> = {};
  const bools = f.getAll("_b").map(String);
  for (const [k, t] of Object.entries(campos)) {
    if (t === "b") {
      if (f.has(k)) fila[k] = true;
      else if (bools.includes(k)) fila[k] = false;
      continue;
    }
    if (!f.has(k)) continue;
    const v = String(f.get(k) ?? "").trim();
    if (v === "") { fila[k] = null; continue; }
    fila[k] = t === "n" ? Number(v.replace(",", ".")) : t === "ts" ? madridAIso(v) : v;
  }
  return fila;
}

const ir = (ruta: string | null, extra = "") => { if (ruta) redirect(ruta + extra); };

/** Crea o actualiza una fila. Campos de control: _tabla, _id, _volver (ruta), _ir (ruta tras crear, + id) */
export async function guardar(f: FormData) {
  const tabla = String(f.get("_tabla"));
  const campos = TABLAS[tabla];
  if (!campos) return;
  const id = String(f.get("_id") ?? "");
  const volver = f.get("_volver") ? String(f.get("_volver")) : null;
  const supabase = await createClient();
  const fila = leer(f, campos);

  let nuevoId: string | null = null;
  let error;
  if (["evento_finanzas", "evento_proveedores_costes", "proveedor_condiciones"].includes(tabla)) {
    ({ error } = await supabase.from(tabla).upsert(fila));
  } else if (id) {
    ({ error } = await supabase.from(tabla).update(fila).eq("id", id));
  } else {
    const r = await supabase.from(tabla).insert(fila).select("id").single();
    error = r.error;
    nuevoId = r.data?.id ?? null;
  }
  if (volver) revalidatePath(volver.split("?")[0]);
  if (error) ir(volver, `${volver?.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  if (nuevoId && f.get("_ir")) redirect(`${f.get("_ir")}${nuevoId}`);
}

export async function borrar(f: FormData) {
  const tabla = String(f.get("_tabla"));
  if (!TABLAS[tabla]) return;
  const supabase = await createClient();
  const volver = f.get("_volver") ? String(f.get("_volver")) : null;
  const { error } = await supabase.from(tabla).delete().eq("id", String(f.get("_id")));
  if (volver) revalidatePath(volver.split("?")[0]);
  if (error) ir(volver, `?error=${encodeURIComponent("No se puede borrar: está vinculado a otros datos.")}`);
  if (f.get("_ir")) redirect(String(f.get("_ir")));
}

export async function comentar(f: FormData) {
  const texto = String(f.get("texto") ?? "").trim();
  if (!texto) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("comentarios").insert({
    entidad_tipo: String(f.get("entidad_tipo")), entidad_id: String(f.get("entidad_id")), texto, autor_id: user?.id,
  });
  revalidatePath(String(f.get("_volver")));
}
