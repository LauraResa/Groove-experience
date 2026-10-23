import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: string | null;
  superadmin: boolean;
  permisos: Set<string>; // "modulo:accion"
};

export const getSesion = cache(async (): Promise<Sesion> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Perfil, rol y permisos en una sola consulta
  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("nombre, email, rol_id, superadmin, roles(clave, permisos(modulo, accion))")
    .eq("id", user.id)
    .single();

  const rol = perfil?.roles as unknown as { clave: string; permisos: { modulo: string; accion: string }[] | null } | null;
  let permisos = rol?.permisos ?? [];
  // Respaldo: si la consulta combinada no devuelve permisos, se piden aparte
  if (error || (perfil?.rol_id && !rol?.permisos)) {
    const { data: p2 } = await supabase.from("perfiles").select("nombre, email, rol_id, superadmin, roles(clave)").eq("id", user.id).single();
    const { data: pm } = p2?.rol_id ? await supabase.from("permisos").select("modulo, accion").eq("rol_id", p2.rol_id) : { data: [] };
    permisos = pm ?? [];
    const r2 = p2?.roles as unknown as { clave: string } | null;
    return {
      id: user.id, nombre: p2?.nombre ?? user.email ?? "", email: user.email ?? "", rol: r2?.clave ?? null,
      superadmin: Boolean(p2?.superadmin), permisos: new Set(permisos.map((p) => `${p.modulo}:${p.accion}`)),
    };
  }
  return {
    id: user.id,
    nombre: perfil?.nombre ?? user.email ?? "",
    email: user.email ?? "",
    rol: rol?.clave ?? null,
    superadmin: Boolean(perfil?.superadmin),
    permisos: new Set(permisos.map((p) => `${p.modulo}:${p.accion}`)),
  };
});

export const puede = (s: Sesion, modulo: string, accion = "ver") =>
  modulo === "usuarios" ? s.superadmin : s.permisos.has(`${modulo}:${accion}`);
