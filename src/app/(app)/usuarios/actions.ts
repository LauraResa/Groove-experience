"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    nombre: txt(f, "nombre") || undefined,
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

export async function crearRol(f: FormData) {
  const supabase = await soloSuperadmin();
  const nombre = txt(f, "nombre");
  if (!nombre) return;
  const clave = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const { data: rol } = await supabase.from("roles").insert({ clave, nombre, descripcion: txt(f, "descripcion") || null }).select("id").single();
  const base = txt(f, "base");
  if (rol && base) {
    const { data: permisos } = await supabase.from("permisos").select("modulo, accion").eq("rol_id", base);
    if (permisos?.length) await supabase.from("permisos").insert(permisos.map((p) => ({ ...p, rol_id: rol.id })));
  }
  revalidatePath("/usuarios");
  if (rol) redirect(`/usuarios?vista=perfiles&perfil=${rol.id}`);
}

export async function guardarRol(f: FormData) {
  const supabase = await soloSuperadmin();
  await supabase.from("roles").update({ nombre: txt(f, "nombre"), descripcion: txt(f, "descripcion") || null }).eq("id", txt(f, "id"));
  revalidatePath("/usuarios");
}

export async function borrarRol(f: FormData) {
  const supabase = await soloSuperadmin();
  const id = txt(f, "id");
  const { count } = await supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("rol_id", id);
  if (count) return; // en uso
  await supabase.from("roles").delete().eq("id", id);
  revalidatePath("/usuarios");
  redirect("/usuarios?vista=perfiles");
}
