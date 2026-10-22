const TZ = "Europe/Madrid";

// minutos que Madrid va por delante de UTC en ese instante
function desfase(fecha: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(fecha).map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((local - fecha.getTime()) / 60000);
}

/** "2026-10-22T10:30" (hora de Madrid) → ISO UTC */
export function madridAIso(v: string) {
  const comoUtc = new Date(`${v}:00Z`);
  return new Date(comoUtc.getTime() - desfase(comoUtc) * 60000).toISOString();
}

/** ISO UTC → "2026-10-22T10:30" en hora de Madrid (para inputs datetime-local) */
export function isoAInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() + desfase(d) * 60000).toISOString().slice(0, 16);
}

export const hoyMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
export const fFecha = (d: string, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString("es-ES", { timeZone: TZ, ...o });
export const fHora = (d: string) => new Date(d).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const fFechaHora = (d: string) => `${fFecha(d, { day: "numeric", month: "short" })} · ${fHora(d)}`;
export const eur = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
