"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
