"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { madridAIso } from "@/lib/fechas";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function crearLead(_: string | null, f: FormData) {
  const supabase = await createClient();

  let cliente_id: string | null = null;
  const empresa = txt(f, "empresa");
  if (empresa) {
    const { data: existente } = await supabase.from("clientes").select("id").ilike("nombre", empresa).maybeSingle();
    cliente_id = existente?.id ?? null;
    if (!cliente_id) {
      const { data, error } = await supabase.from("clientes")
        .insert({ nombre: empresa, tipo: txt(f, "tipo_cliente") ?? "empresa" }).select("id").single();
      if (error) return error.message;
      cliente_id = data.id;
    }
  }

  let contacto_id: string | null = null;
  const contacto = txt(f, "contacto");
  if (contacto) {
    const { data, error } = await supabase.from("contactos")
      .insert({ cliente_id, nombre: contacto, email: txt(f, "email"), telefono: txt(f, "telefono"), principal: true })
      .select("id").single();
    if (error) return error.message;
    contacto_id = data.id;
  }

  const { error } = await supabase.from("leads").insert({
    titulo: txt(f, "titulo") ?? empresa ?? "Sin título",
    cliente_id, contacto_id,
    origen: txt(f, "origen"),
    categoria_id: txt(f, "categoria_id"),
    campana_id: txt(f, "campana_id"),
    fecha_prevista: txt(f, "fecha_prevista"),
    asistentes: txt(f, "asistentes") ? Number(f.get("asistentes")) : null,
    presupuesto_estimado: txt(f, "presupuesto") ? Number(f.get("presupuesto")) : null,
    responsable_id: txt(f, "responsable_id"),
    estado_id: txt(f, "estado_id"),
    prioridad: txt(f, "prioridad") ?? "media",
    proxima_accion: txt(f, "proxima_accion"),
    fecha_proxima_accion: txt(f, "fecha_proxima_accion"),
    notas: txt(f, "notas"),
  });
  if (error) return error.message;
  revalidatePath("/leads");
  revalidatePath("/");
  return "ok";
}

export async function moverLead(f: FormData) {
  const supabase = await createClient();
  await supabase.from("leads").update({ estado_id: txt(f, "estado_id") }).eq("id", txt(f, "id"));
  revalidatePath("/leads");
  revalidatePath("/");
}

const num = (f: FormData, k: string) => (txt(f, k) ? Number(f.get(k)) : null);

export async function actualizarLead(f: FormData) {
  const id = txt(f, "id");
  const supabase = await createClient();
  await supabase.from("leads").update({
    titulo: txt(f, "titulo") ?? "Sin título",
    origen: txt(f, "origen"),
    categoria_id: txt(f, "categoria_id"),
    campana_id: txt(f, "campana_id"),
    fecha_prevista: txt(f, "fecha_prevista"),
    asistentes: num(f, "asistentes"),
    presupuesto_estimado: num(f, "presupuesto"),
    responsable_id: txt(f, "responsable_id"),
    estado_id: txt(f, "estado_id"),
    prioridad: txt(f, "prioridad") ?? "media",
    ...(f.has("proxima_accion") ? { proxima_accion: txt(f, "proxima_accion"), fecha_proxima_accion: txt(f, "fecha_proxima_accion") } : {}),
    ...(f.has("motivo_perdida") ? { motivo_perdida: txt(f, "motivo_perdida") } : {}),
    notas: txt(f, "notas"),
  }).eq("id", id);
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
}

export async function anadirActividad(f: FormData) {
  const lead_id = txt(f, "lead_id");
  const supabase = await createClient();
  const inicio = txt(f, "inicio");
  await supabase.from("actividades").insert({
    lead_id,
    tipo: txt(f, "tipo") ?? "nota",
    inicio: inicio ? madridAIso(inicio) : null,
    descripcion: txt(f, "descripcion"),
  });
  revalidatePath(`/leads/${lead_id}`);
}

export async function comentar(f: FormData) {
  const entidad_id = txt(f, "entidad_id");
  const texto = txt(f, "texto");
  if (!texto) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("comentarios").insert({ entidad_tipo: txt(f, "entidad_tipo"), entidad_id, texto, autor_id: user?.id });
  revalidatePath(`/leads/${entidad_id}`);
}

/** Cierra la próxima acción actual (la registra en la actividad) y fija la siguiente */
export async function registrarSeguimiento(f: FormData) {
  const id = txt(f, "lead_id");
  if (!id) return;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("proxima_accion").eq("id", id).single();
  const hecho = lead?.proxima_accion;
  const nota = txt(f, "nota");
  if (hecho || nota) {
    await supabase.from("actividades").insert({
      lead_id: id, tipo: txt(f, "tipo") ?? "nota",
      descripcion: [hecho && `Hecho: ${hecho}`, nota].filter(Boolean).join(" — "),
    });
  }
  await supabase.from("leads").update({ proxima_accion: txt(f, "proxima_accion"), fecha_proxima_accion: txt(f, "fecha_proxima_accion") }).eq("id", id);
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/");
}
