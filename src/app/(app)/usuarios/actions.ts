"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSesion } from "@/lib/sesion";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function soloSuperadmin() {
  const s = await getSesion();
  if (!s.superadmin) throw new Error("Solo superadmin");
  return createClient();
}

export async function crearUsuario(_: string | null, f: FormData) {
  const supabase = await soloSuperadmin();
  const { error } = await supabase.rpc("admin_crear_usuario", {
    p_email: txt(f, "email"),
    p_password: txt(f, "password"),
    p_nombre: txt(f, "nombre"),
    p_rol_clave: txt(f, "rol"),
    p_superadmin: f.get("superadmin") === "on",
  });
  if (error) return error.message;
  revalidatePath("/usuarios");
  return "ok";
}

export async function actualizarUsuario(f: FormData) {
  const supabase = await soloSuperadmin();
  await supabase.from("perfiles").update({
    rol_id: txt(f, "rol_id") || null,
    superadmin: f.get("superadmin") === "on",
    activo: f.get("activo") === "on",
  }).eq("id", txt(f, "id"));
  revalidatePath("/usuarios");
}

export async function cambiarPasswordDe(_: string | null, f: FormData) {
  const supabase = await soloSuperadmin();
  const { error } = await supabase.rpc("admin_cambiar_password", { p_usuario: txt(f, "id"), p_password: txt(f, "password") });
  return error ? error.message : "ok";
}

export async function alternarPermiso(f: FormData) {
  const supabase = await soloSuperadmin();
  const fila = { rol_id: txt(f, "rol_id"), modulo: txt(f, "modulo"), accion: txt(f, "accion") };
  if (f.get("activo") === "1") {
    await supabase.from("permisos").delete().match(fila);
  } else {
    await supabase.from("permisos").insert(fila);
  }
  revalidatePath("/usuarios");
}
