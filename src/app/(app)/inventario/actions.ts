"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TEXTO = ["nombre", "codigo", "descripcion", "unidad", "medidas_nota", "material", "color", "estado", "ubicacion", "disponibilidad", "pendiente", "observaciones", "categoria_id"] as const;
const NUM = ["cantidad", "cantidad_min", "cantidad_max", "ancho_cm", "alto_cm", "fondo_cm", "unidades_deterioradas"] as const;

function leer(f: FormData) {
  const fila: Record<string, string | number | boolean | null> = {};
  for (const k of TEXTO) if (f.has(k)) fila[k] = String(f.get(k) ?? "").trim() || null;
  for (const k of NUM) {
    if (!f.has(k)) continue;
    const v = String(f.get(k) ?? "").trim().replace(",", ".");
    fila[k] = v === "" ? null : Number(v);
    if (fila[k] !== null && Number.isNaN(fila[k])) throw new Error(`Valor no válido en ${k.replace("_cm", "").replace("_", " ")}.`);
  }
  if (f.has("_conf")) fila.cantidad_confirmada = f.has("cantidad_confirmada");
  if (fila.unidades_deterioradas === null) fila.unidades_deterioradas = 0;
  if (fila.estado === null) delete fila.estado;
  if (fila.cantidad_confirmada && fila.cantidad === null) throw new Error("Para marcar la cantidad como confirmada hay que indicar cuántas unidades hay.");
  return fila;
}

const volverCon = (ruta: string, error: string) => redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);

function mensaje(e: { message: string; code?: string }) {
  if (e.code === "23505") return "Ya existe otro artículo con ese código.";
  if (e.code === "42501") return "No tienes permiso para hacer este cambio.";
  if (e.code === "23514") return "Algún valor no es válido (las cantidades no pueden ser negativas).";
  return e.message;
}

export async function guardarItem(f: FormData) {
  const id = String(f.get("_id") ?? "");
  const origen = id ? `/inventario/${id}` : "/inventario/nuevo";
  let fila;
  try { fila = leer(f); } catch (e) { return volverCon(origen, (e as Error).message); }
  if (!id && !fila.nombre) return volverCon(origen, "El nombre es obligatorio.");
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("inventario_items").update(fila).eq("id", id);
    if (error) return volverCon(origen, mensaje(error));
  } else {
    const { data, error } = await supabase.from("inventario_items").insert(fila).select("id").single();
    if (error || !data) return volverCon(origen, error ? mensaje(error) : "No se ha podido crear.");
    revalidatePath("/inventario", "layout");
    redirect(`/inventario/${data.id}?ok=creado`);
  }
  revalidatePath("/inventario", "layout");
  redirect(`/inventario/${id}?ok=guardado`);
}

export async function duplicarItem(f: FormData) {
  const id = String(f.get("_id"));
  const supabase = await createClient();
  const { data: o } = await supabase.from("inventario_items").select("*").eq("id", id).single();
  if (!o) return volverCon(`/inventario/${id}`, "No se encuentra el artículo.");
  const { id: _i, creado_en: _c, actualizado_en: _a, actualizado_por: _p, codigo: _co, ...resto } = o;
  void _i; void _c; void _a; void _p; void _co;
  const { data, error } = await supabase.from("inventario_items").insert({ ...resto, nombre: `${o.nombre} (copia)` }).select("id").single();
  if (error || !data) return volverCon(`/inventario/${id}`, error ? mensaje(error) : "No se ha podido duplicar.");
  revalidatePath("/inventario", "layout");
  redirect(`/inventario/${data.id}?ok=duplicado`);
}

export async function borrarItem(f: FormData) {
  const id = String(f.get("_id"));
  const supabase = await createClient();
  const { data: fs } = await supabase.from("inventario_fotos").select("storage_path").eq("item_id", id);
  const { error } = await supabase.from("inventario_items").delete().eq("id", id);
  if (error) return volverCon(`/inventario/${id}`, error.code === "23503" ? "No se puede borrar: está incluido en la selección de algún evento." : mensaje(error));
  if (fs?.length) await supabase.storage.from("inventario").remove(fs.map((x) => x.storage_path));
  revalidatePath("/inventario", "layout");
  redirect("/inventario/catalogo?ok=borrado");
}

/** Marca deterioro rápido desde la ficha */
export async function marcarEstado(f: FormData) {
  const id = String(f.get("_id"));
  const estado = String(f.get("estado"));
  const uds = Number(String(f.get("unidades_deterioradas") ?? "0") || 0);
  const supabase = await createClient();
  const { error } = await supabase.from("inventario_items").update({ estado, unidades_deterioradas: Math.max(0, uds) }).eq("id", id);
  if (error) return volverCon(`/inventario/${id}`, mensaje(error));
  revalidatePath("/inventario", "layout");
  redirect(`/inventario/${id}?ok=guardado`);
}

// ---- Fotos: el archivo se sube desde el navegador al bucket; aquí solo se registra ----

export async function registrarFotos(itemId: string, paths: string[], sustituye?: string) {
  const supabase = await createClient();
  const { data: ult } = await supabase.from("inventario_fotos").select("orden").eq("item_id", itemId).order("orden", { ascending: false }).limit(1);
  let orden = (ult?.[0]?.orden ?? -1) + 1;
  if (sustituye) {
    const { data: vieja } = await supabase.from("inventario_fotos").select("id, storage_path, orden").eq("id", sustituye).single();
    if (vieja) {
      orden = vieja.orden;
      await supabase.from("inventario_fotos").delete().eq("id", vieja.id);
      await supabase.storage.from("inventario").remove([vieja.storage_path]);
    }
  }
  const { error } = await supabase.from("inventario_fotos").insert(paths.map((p, k) => ({ item_id: itemId, storage_path: p, orden: orden + k })));
  revalidatePath("/inventario", "layout");
  return error ? mensaje(error) : null;
}

export async function borrarFoto(fotoId: string) {
  const supabase = await createClient();
  const { data: ft } = await supabase.from("inventario_fotos").select("storage_path").eq("id", fotoId).single();
  const { error } = await supabase.from("inventario_fotos").delete().eq("id", fotoId);
  if (!error && ft) await supabase.storage.from("inventario").remove([ft.storage_path]);
  revalidatePath("/inventario", "layout");
  return error ? mensaje(error) : null;
}

/** Pone una foto como principal (orden 0) y desplaza el resto */
export async function fotoPrincipal(itemId: string, fotoId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("inventario_fotos").select("id").eq("item_id", itemId).order("orden");
  const ids = [fotoId, ...(data ?? []).map((x) => x.id).filter((x) => x !== fotoId)];
  for (const [k, fid] of ids.entries()) await supabase.from("inventario_fotos").update({ orden: k }).eq("id", fid);
  revalidatePath("/inventario", "layout");
  return null;
}
