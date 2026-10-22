"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Tipo = "texto" | "numero" | "fecha" | "bool" | "uuid";

// Tablas editables desde Configuración y sus campos
const TABLAS: Record<string, Record<string, Tipo>> = {
  condiciones_estandar: { regla: "texto", valor: "numero", activa: "bool" },
  estados_lead: { nombre: "texto", orden: "numero", color: "texto", es_ganado: "bool", es_perdido: "bool" },
  categorias: { nombre: "texto", padre_id: "uuid", orden: "numero", activa: "bool" },
  espacios: { nombre: "texto", aforo: "numero", notas: "texto" },
  categorias_proveedor: { nombre: "texto", orden: "numero" },
  campanas: { nombre: "texto", fecha_ini: "fecha", fecha_fin: "fecha", objetivo: "texto", activa: "bool" },
};

function leer(f: FormData, campos: Record<string, Tipo>) {
  const fila: Record<string, string | number | boolean | null> = {};
  for (const [k, t] of Object.entries(campos)) {
    if (t === "bool") { fila[k] = f.get(k) === "on"; continue; }
    if (!f.has(k)) continue;
    const v = String(f.get(k) ?? "").trim();
    fila[k] = v === "" ? null : t === "numero" ? Number(v) : v;
  }
  return fila;
}

export async function guardarFila(f: FormData) {
  const tabla = String(f.get("_tabla"));
  const campos = TABLAS[tabla];
  if (!campos) return;
  const id = String(f.get("_id") ?? "");
  const supabase = await createClient();
  const fila = leer(f, campos);
  const { error } = id
    ? await supabase.from(tabla).update(fila).eq("id", id)
    : await supabase.from(tabla).insert(fila);
  revalidatePath("/configuracion");
  if (error) redirect(`/configuracion?error=${encodeURIComponent(error.message)}#${tabla}`);
  redirect(`/configuracion?ok=1#${tabla}`);
}

export async function borrarFila(f: FormData) {
  const tabla = String(f.get("_tabla"));
  if (!TABLAS[tabla]) return;
  const supabase = await createClient();
  const { error } = await supabase.from(tabla).delete().eq("id", String(f.get("_id")));
  revalidatePath("/configuracion");
  if (error) redirect(`/configuracion?error=${encodeURIComponent("No se puede borrar: está en uso. Desactívalo en su lugar.")}#${tabla}`);
  redirect(`/configuracion#${tabla}`);
}
