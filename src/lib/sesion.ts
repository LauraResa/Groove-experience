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

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, email, rol_id, superadmin, roles(clave)")
    .eq("id", user.id)
    .single();

  const { data: permisos } = perfil?.rol_id
    ? await supabase.from("permisos").select("modulo, accion").eq("rol_id", perfil.rol_id)
    : { data: [] };

  const rol = perfil?.roles as unknown as { clave: string } | null;
  return {
    id: user.id,
    nombre: perfil?.nombre ?? user.email ?? "",
    email: user.email ?? "",
    rol: rol?.clave ?? null,
    superadmin: Boolean(perfil?.superadmin),
    permisos: new Set((permisos ?? []).map((p) => `${p.modulo}:${p.accion}`)),
  };
});

export const puede = (s: Sesion, modulo: string, accion = "ver") =>
  modulo === "usuarios" ? s.superadmin : s.permisos.has(`${modulo}:${accion}`);
