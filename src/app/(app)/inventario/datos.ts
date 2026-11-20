import { createClient } from "@/lib/supabase/server";
import { type Categoria, type Item, SELECT_ITEM } from "@/lib/inventario";

export async function cargarInventario() {
  const supabase = await createClient();
  const [{ data: cats }, { data: items }] = await Promise.all([
    supabase.from("inventario_categorias").select("id, slug, nombre, orden").order("orden"),
    supabase.from("inventario_items").select(SELECT_ITEM).order("nombre"),
  ]);
  const categorias = (cats ?? []) as Categoria[];
  return { categorias, items: (items ?? []) as Item[], porId: new Map(categorias.map((c) => [c.id, c])) };
}
