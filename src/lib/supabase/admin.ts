import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Cliente de administración de Supabase (API oficial de Auth Admin).
 * Usa la clave secreta SUPABASE_SECRET_KEY, que solo existe en el servidor (Vercel).
 * "server-only" impide que este archivo llegue nunca al navegador.
 */
export function clienteAdmin() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) return null;
  return createClient(SUPABASE_URL, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
