import { SUPABASE_URL } from "@/lib/supabase/config";

export type Categoria = { id: string; slug: string; nombre: string; orden: number };
export type Foto = { id: string; storage_path: string; orden: number };
export type Item = {
  id: string;
  codigo: string | null;
  categoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  cantidad: number | null;
  cantidad_confirmada: boolean;
  cantidad_min: number | null;
  cantidad_max: number | null;
  unidad: string | null;
  ancho_cm: number | null;
  alto_cm: number | null;
  fondo_cm: number | null;
  medidas_nota: string | null;
  material: string | null;
  color: string | null;
  estado: string;
  unidades_deterioradas: number;
  ubicacion: string | null;
  disponibilidad: string | null;
  pendiente: string | null;
  observaciones: string | null;
  actualizado_en: string;
  inventario_fotos?: Foto[];
};

export const SELECT_ITEM = "*, inventario_fotos(id, storage_path, orden)";

export const ESTADOS: Record<string, string> = {
  por_revisar: "Por revisar",
  bueno: "Buen estado",
  desgaste: "Con desgaste",
  deteriorado: "Deteriorado",
  fuera_servicio: "Fuera de servicio",
};

export const DISPONIBILIDAD: Record<string, string> = {
  disponible: "Disponible",
  limitada: "Disponibilidad limitada",
  no_disponible: "No disponible",
};

export const RANGOS_CANTIDAD = [
  { v: "sin", t: "Sin cantidad" },
  { v: "1-10", t: "1 a 10" },
  { v: "11-50", t: "11 a 50" },
  { v: "51+", t: "Más de 50" },
];

export const fotoUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/inventario/${path}`;
export const fotos = (i: Item) => [...(i.inventario_fotos ?? [])].sort((a, b) => a.orden - b.orden);

/** Pendiente de confirmar: cantidad sin verificar o algún dato marcado como pendiente */
export const esPendiente = (i: Item) => !i.cantidad_confirmada || Boolean(i.pendiente);

/** Unidades que cuentan como stock confirmado */
export const confirmadas = (i: Item) => (i.cantidad_confirmada ? i.cantidad ?? 0 : 0);

/** Unidades utilizables: confirmadas, sin las deterioradas, y solo si el artículo está disponible */
export const utilizables = (i: Item) => {
  if (!i.cantidad_confirmada || i.disponibilidad === "no_disponible" || i.estado === "fuera_servicio") return 0;
  return Math.max(0, (i.cantidad ?? 0) - (i.unidades_deterioradas ?? 0));
};

const n = (x: number | null) => (x === null ? null : Number(x).toLocaleString("es-ES"));

export function medidas(i: Item) {
  const partes = [
    i.ancho_cm !== null && `${n(i.ancho_cm)} an.`,
    i.alto_cm !== null && `${n(i.alto_cm)} al.`,
    i.fondo_cm !== null && `${n(i.fondo_cm)} fo.`,
  ].filter(Boolean);
  return partes.length ? `${partes.join(" × ")} cm` : null;
}

/** Texto principal de cantidad: confirmada, estimada o sin dato */
export function cantidadTexto(i: Item): { valor: string; nota: string | null; tipo: "confirmada" | "estimada" | "sin" } {
  if (i.cantidad_confirmada && i.cantidad !== null) return { valor: n(i.cantidad)!, nota: i.unidad, tipo: "confirmada" };
  if (i.cantidad_min !== null || i.cantidad_max !== null) {
    const r = i.cantidad_min !== null && i.cantidad_max !== null ? `${n(i.cantidad_min)}–${n(i.cantidad_max)}` : n(i.cantidad_min ?? i.cantidad_max)!;
    return { valor: r, nota: "estimado", tipo: "estimada" };
  }
  if (i.cantidad !== null) return { valor: n(i.cantidad)!, nota: "sin confirmar", tipo: "estimada" };
  return { valor: "—", nota: "sin cantidad", tipo: "sin" };
}

export function enRango(i: Item, rango: string) {
  const c = i.cantidad_confirmada ? i.cantidad : null;
  if (!rango) return true;
  if (rango === "sin") return c === null;
  if (c === null) return false;
  if (rango === "51+") return c > 50;
  const [a, b] = rango.split("-").map(Number);
  return c >= a && c <= b;
}

export function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
}
