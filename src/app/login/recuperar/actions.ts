"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function recuperar(_: string | null, f: FormData) {
  const h = await headers();
  const origen = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(String(f.get("email") ?? "").trim(), {
    redirectTo: `${origen}/auth/callback?next=/perfil?nueva=1`,
  });
  // misma respuesta exista o no el email
  return "ok";
}
