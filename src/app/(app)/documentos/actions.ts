"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function vincularDocumento(f: FormData) {
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documentos").insert({
    carpeta: String(f.get("carpeta") ?? "comercial"), nombre: String(f.get("nombre")), url_externa: String(f.get("url_externa")),
  }).select("id").single();
  const tipo = String(f.get("entidad_tipo") ?? "");
  if (doc && tipo) await supabase.from("documento_vinculos").insert({ documento_id: doc.id, entidad_tipo: tipo, entidad_id: String(f.get("entidad_id")) });
  revalidatePath(String(f.get("_volver") ?? "/documentos"));
}
