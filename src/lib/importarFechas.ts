/**
 * Interpreta un texto pegado (Excel, documento, WhatsApp…) con una fecha por línea.
 * Formatos admitidos de fecha: 18/10/2026 · 18-10-26 · 18.10 · 2026-10-18 · 18 de octubre (de 2026) · sáb 18 oct
 * Horario: 22:00-06:00 · 22h-6h · de 10:30 a 14:00 · 22:00 (sin fin → 2 h). Fin < inicio = termina al día siguiente.
 * "Posible": ?, posible, provisional, tentativo, pendiente, por/a/sin confirmar, TBC, TBD.
 */

export type FilaImportada = {
  linea: number;
  original: string;
  fecha: string | null;      // YYYY-MM-DD
  inicio: string | null;     // YYYY-MM-DDTHH:MM (hora de Madrid)
  fin: string | null;
  todoElDia: boolean;
  titulo: string;
  posible: boolean;
  avisos: string[];
  error: string | null;
};

const MESES: Record<string, number> = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4, mayo: 5, may: 5, junio: 6, jun: 6,
  julio: 7, jul: 7, agosto: 8, ago: 8, septiembre: 9, setiembre: 9, sept: 9, sep: 9, set: 9, octubre: 10, oct: 10,
  noviembre: 11, nov: 11, diciembre: 12, dic: 12,
};
const MES_RE = Object.keys(MESES).sort((a, b) => b.length - a.length).join("|");
const DIAS_SEMANA = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\b\.?,?/gi;
const POSIBLE = /\?|\b(posibles?|provisional(es)?|tentativ[oa]s?|pendientes?|por confirmar|a confirmar|sin confirmar|tbc|tbd)\b/gi;

const dos = (n: number) => String(n).padStart(2, "0");
const sumarDia = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
function fechaValida(a: number, m: number, d: number) {
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}
const anio = (y: string | undefined, porDefecto: number) => !y ? porDefecto : y.length === 2 ? 2000 + Number(y) : Number(y);

export function interpretarLinea(texto: string, linea: number, anioPorDefecto: number): FilaImportada | null {
  const original = texto.trim();
  if (!original) return null;
  let resto = ` ${original.replace(/\t+/g, " | ")} `;
  const avisos: string[] = [];

  // 1. Horario (se busca antes que la fecha para no confundir "22:00-06:00" con una fecha)
  const H = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*h?`;
  const rango = new RegExp(String.raw`(?:de\s+|desde\s+)?\b${H}\s*(?:-|–|a|hasta)\s*${H}\b(?:\s*h\b)?`, "gi");
  const suelta = new RegExp(String.raw`\b(\d{1,2})(?::(\d{2})|h(\d{2})?\b|\s*h\b)`, "i");
  let hIni: string | null = null, hFin: string | null = null;
  const esHora = (m: RegExpMatchArray) => /\d[:h]|h\b/i.test(m[0]);
  const mR = [...resto.matchAll(rango)].find((m) => esHora(m) && Number(m[1]) < 24 && Number(m[3]) <= 24);
  if (mR) {
    hIni = `${dos(Number(mR[1]))}:${mR[2] ?? "00"}`;
    hFin = `${dos(Number(mR[3]) % 24)}:${mR[4] ?? "00"}`;
    resto = resto.replace(mR[0], " ");
  } else {
    const mS = resto.match(suelta);
    if (mS && Number(mS[1]) < 24) {
      hIni = `${dos(Number(mS[1]))}:${mS[2] ?? mS[3] ?? "00"}`;
      resto = resto.replace(mS[0], " ");
    }
  }

  // 2. Fecha
  let fecha: string | null = null;
  let error: string | null = null;
  const pruebas: [RegExp, (m: RegExpMatchArray) => [number, number, number]][] = [
    [/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, (m) => [Number(m[1]), Number(m[2]), Number(m[3])]],
    [/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => [anio(m[3], anioPorDefecto), Number(m[2]), Number(m[1])]],
    [new RegExp(String.raw`\b(\d{1,2})\s*(?:de\s+)?(${MES_RE})\.?(?:\s*(?:de\s+|del\s+)?(\d{4}))?\b`, "i"), (m) => [anio(m[3], anioPorDefecto), MESES[m[2].toLowerCase()], Number(m[1])]],
    [/\b(\d{1,2})[-.](\d{1,2})(?:[-.](\d{2,4}))?\b/, (m) => [anio(m[3], anioPorDefecto), Number(m[2]), Number(m[1])]],
  ];
  for (const [re, f] of pruebas) {
    const m = resto.match(re);
    if (!m) continue;
    const [a, mes, d] = f(m);
    if (fechaValida(a, mes, d)) { fecha = `${a}-${dos(mes)}-${dos(d)}`; resto = resto.replace(m[0], " "); }
    else error = `Fecha imposible: «${m[0].trim()}»`;
    break;
  }
  if (!fecha && !error) error = "No se encuentra ninguna fecha";

  // 3. ¿Posible?
  const posible = POSIBLE.test(resto);
  POSIBLE.lastIndex = 0;
  resto = resto.replace(POSIBLE, " ");

  // 4. Título: lo que queda
  const titulo = resto.replace(DIAS_SEMANA, " ").replace(/[()[\]]/g, " ").replace(/\s*[|,;–-]\s*/g, " ").replace(/\s+/g, " ").trim() || "Sin título";

  // 5. Inicio / fin
  let inicio: string | null = null, fin: string | null = null, todoElDia = false;
  if (fecha) {
    if (hIni && hFin) {
      inicio = `${fecha}T${hIni}`;
      const diaFin = hFin <= hIni ? sumarDia(fecha, 1) : fecha;
      fin = `${diaFin}T${hFin}`;
      if (diaFin !== fecha) avisos.push("Termina al día siguiente");
    } else if (hIni) {
      inicio = `${fecha}T${hIni}`;
      const [hh, mm] = hIni.split(":").map(Number);
      const finMin = hh * 60 + mm + 120;
      fin = finMin >= 1440 ? `${sumarDia(fecha, 1)}T${dos(Math.floor((finMin - 1440) / 60))}:${dos(finMin % 60)}` : `${fecha}T${dos(Math.floor(finMin / 60))}:${dos(finMin % 60)}`;
      avisos.push("Sin hora de fin: se ponen 2 h");
    } else {
      inicio = `${fecha}T00:00`;
      fin = `${sumarDia(fecha, 1)}T00:00`;
      todoElDia = true;
    }
  }

  return { linea, original, fecha, inicio, fin, todoElDia, titulo, posible, avisos, error };
}

export function interpretarTexto(texto: string, anioPorDefecto: number) {
  return texto.split(/\r?\n/).slice(0, 500)
    .map((l, i) => interpretarLinea(l, i + 1, anioPorDefecto))
    .filter((x): x is FilaImportada => x !== null);
}
