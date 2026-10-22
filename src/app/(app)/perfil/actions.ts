"use server";

import { createClient } from "@/lib/supabase/server";

export async function cambiarMiPassword(_: string | null, f: FormData) {
  const pass = String(f.get("password") ?? "");
  if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (pass !== String(f.get("repetir") ?? "")) return "Las contraseñas no coinciden";
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pass });
  return error ? error.message : "ok";
}
