import { EST_TAREA } from "@/lib/estados";
import { fFecha } from "@/lib/fechas";

export type ItemRoadmap = {
  id: string; semana: number | null; area: string | null; objetivo: string | null; titulo: string;
  responsable_id: string | null; corresponsable_id: string | null; colaborador_id: string | null; participantes: string[] | null;
  depende_de_id: string | null; fecha_inicio: string | null; fecha_limite: string | null; estado: string; prioridad: string;
  resultado_esperado: string | null; comentarios: string | null;
};
export type LogRoadmap = { entidad_id: string; creado_en: string; usuario_id: string | null; cambios: { antes?: Record<string, unknown>; despues?: Record<string, unknown> } | null };
export type Cambio = { fecha: string; quien: string; textos: string[] };

/** «Laura + Cris» */
export const responsables = (i: ItemRoadmap, nombre: Map<string, string>) =>
  [i.responsable_id, i.corresponsable_id].map((id) => id && nombre.get(id)).filter(Boolean).join(" + ");

/** «Laura + Cris · con Juan · Participantes: Rubén, Rodri» */
export function quien(i: ItemRoadmap, nombre: Map<string, string>) {
  const part = (i.participantes ?? []).map((id) => nombre.get(id)).filter(Boolean);
  const colab = i.colaborador_id && nombre.get(i.colaborador_id);
  return [responsables(i, nombre), colab && `con ${colab}`, part.length && `Participantes: ${part.join(", ")}`].filter(Boolean).join(" · ");
}

const CAMPOS: [string, string, "estado" | "fecha" | "persona"][] = [
  ["estado", "Estado", "estado"], ["fecha_inicio", "Inicio", "fecha"], ["fecha_limite", "Fecha", "fecha"],
  ["responsable_id", "Responsable", "persona"], ["corresponsable_id", "Corresponsable", "persona"],
];

/** Cambios importantes (estado, fechas, responsable, corresponsable) por acción, del más reciente al más antiguo */
export function cambiosPorItem(logs: LogRoadmap[], nombre: Map<string, string>) {
  const m = new Map<string, Cambio[]>();
  for (const l of logs) {
    const a = l.cambios?.antes, d = l.cambios?.despues;
    if (!a || !d) continue;
    const ver = (v: unknown, t: string) => !v ? "—" : t === "estado" ? EST_TAREA[String(v)] ?? String(v)
      : t === "fecha" ? fFecha(String(v), { day: "2-digit", month: "2-digit", year: "numeric" }) : nombre.get(String(v)) ?? "usuario retirado";
    const textos = CAMPOS.filter(([k]) => (a[k] ?? null) !== (d[k] ?? null)).map(([k, t, tipo]) => `${t}: ${ver(a[k], tipo)} → ${ver(d[k], tipo)}`);
    if (!textos.length) continue;
    m.set(l.entidad_id, [...(m.get(l.entidad_id) ?? []), { fecha: l.creado_en, quien: l.usuario_id ? nombre.get(l.usuario_id) ?? "—" : "Corrección por SQL", textos }]);
  }
  for (const l of m.values()) l.sort((x, y) => y.fecha.localeCompare(x.fecha));
  return m;
}
