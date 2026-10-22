import type { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

export const ABIERTAS = ["borrador", "pendiente_aprobacion", "aprobada", "enviada", "negociacion"];

/** Huella económica de la propuesta: si cambia, la aprobación deja de valer */
export async function huellaPropuesta(supabase: SB, id: string) {
  const [{ data: p }, { data: t }] = await Promise.all([
    supabase.from("propuestas").select("descuento_pct, asistentes").eq("id", id).single(),
    supabase.from("propuesta_totales").select("total, coste").eq("propuesta_id", id).maybeSingle(),
  ]);
  const r = (n: unknown) => Math.round(Number(n ?? 0) * 100) / 100;
  return JSON.stringify({ total: r(t?.total), coste: r(t?.coste), descuento: r(p?.descuento_pct), asistentes: Number(p?.asistentes ?? 0) });
}

export const huellaDe = (detalle: string | null) => { try { return detalle ? JSON.parse(detalle).huella ?? null : null; } catch { return null; } };

/** ¿Puede avanzar sin (nueva) aprobación? Devuelve también la última aprobación */
export async function aprobacionVigente(supabase: SB, id: string) {
  const { data: p } = await supabase.from("propuestas").select("requiere_aprobacion").eq("id", id).single();
  const { data: ap } = await supabase.from("aprobaciones").select("estado, detalle").eq("entidad_tipo", "propuesta").eq("entidad_id", id)
    .order("solicitada_en", { ascending: false }).limit(1).maybeSingle();
  if (!p?.requiere_aprobacion) return { ok: true, ap, cambiada: false };
  const cambiada = ap?.estado === "aprobada" && huellaDe(ap.detalle) !== null && huellaDe(ap.detalle) !== (await huellaPropuesta(supabase, id));
  return { ok: ap?.estado === "aprobada" && !cambiada, ap, cambiada };
}

