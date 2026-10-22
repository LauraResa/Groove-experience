// Claves públicas (publishable): seguras en el cliente; la seguridad la aplica RLS.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://uogqpeoknxxwtibfhgka.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_8YkkWe_D4dwA0iHl35u_TQ_jbxbu47Z";
