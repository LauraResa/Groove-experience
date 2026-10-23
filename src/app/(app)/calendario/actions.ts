"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { madridAIso } from "@/lib/fechas";
import { interpretarTexto, type FilaImportada } from "@/lib/importarFechas";

export type FilaAnalizada = FilaImportada & { duplicado: boolean };
export type Analisis = { filas: FilaAnalizada[]; error?: string } | null;

const TIPOS = ["sesion_groove", "bloqueo", "no_disponible", "montaje", "desmontaje", "otro"];
const dia = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Paso 1: interpreta el texto y avisa de duplicados. No guarda nada. */
export async function analizarFechas(_: Analisis, f: FormData): Promise<Analisis> {
  const texto = String(f.get("texto") ?? "");
  if (!texto.trim()) return { filas: [], error: "Pega al menos una línea con fecha." };
  const anio = Number(f.get("anio")) || new Date().getFullYear();
  const filas = interpretarTexto(texto, anio).map((r) => ({
    ...r,
    inicio: r.inicio ? madridAIso(r.inicio) : null,
    fin: r.fin ? madridAIso(r.fin) : null,
  }));
  const validas = filas.filter((r) => r.inicio && r.fin);
  let existentes: { titulo: string; inicio: string; fin: string; estilo: string; capa: string }[] = [];
  if (validas.length) {
    const desde = validas.reduce((m, r) => (r.inicio! < m ? r.inicio! : m), validas[0].inicio!);
    const hasta = validas.reduce((m, r) => (r.fin! > m ? r.fin! : m), validas[0].fin!);
    const supabase = await createClient();
    const { data } = await supabase.from("calendario").select("titulo, inicio, fin, estilo, capa").lt("inicio", hasta).gt("fin", desde);
    existentes = data ?? [];
  }
  return {
    filas: filas.map((r) => {
      if (!r.inicio || !r.fin) return { ...r, duplicado: false };
      const duplicado = existentes.some((e) => e.capa === "bloque" && e.titulo.trim().toLowerCase() === r.titulo.trim().toLowerCase() && dia(e.inicio) === dia(r.inicio!));
      return { ...r, duplicado };
    }),
  };
}

/** Paso 2: guarda las filas que la persona ha dejado marcadas. */
export async function importarFechas(_: string | null, f: FormData): Promise<string | null> {
  let filas: { titulo: string; inicio: string; fin: string; tipo: string; posible: boolean }[];
  try { filas = JSON.parse(String(f.get("filas") ?? "[]")); } catch { return "Datos no válidos."; }
  const limpias = filas
    .filter((r) => TIPOS.includes(r.tipo) && !Number.isNaN(Date.parse(r.inicio)) && !Number.isNaN(Date.parse(r.fin)) && r.fin > r.inicio)
    .slice(0, 500)
    .map((r) => ({
      tipo: r.tipo, titulo: String(r.titulo || "Sin título").slice(0, 200), inicio: r.inicio, fin: r.fin,
      provisional: !!r.posible, notas: "Importado desde lista",
    }));
  if (!limpias.length) return "No hay ninguna fecha marcada para importar.";
  const supabase = await createClient();
  let { error } = await supabase.from("calendario_bloques").insert(limpias);
  // Si la migración de "fechas posibles" aún no está aplicada, se guarda la marca en el título
  if (error && /provisional/i.test(error.message)) {
    ({ error } = await supabase.from("calendario_bloques").insert(
      limpias.map(({ provisional, ...r }) => ({ ...r, titulo: provisional ? `${r.titulo} (posible)` : r.titulo })),
    ));
  }
  if (error) return error.message;
  revalidatePath("/calendario");
  return `ok:${limpias.length}`;
}
