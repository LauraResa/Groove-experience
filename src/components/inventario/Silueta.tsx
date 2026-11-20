/** Dibujos lineales genéricos por categoría para artículos sin fotografía (no representan el material real) */
const TRAZOS: Record<string, string> = {
  sillas: "M42 22v56M42 58h38v20M80 58v40M42 78v20M42 22h4M46 22v36",
  mesas: "M18 46h84M24 46l-6 52M96 46l6 52M30 46v10h60V46",
  lounge: "M18 58v28h84V58M18 58a8 8 0 0 1 16 0v14h52V58a8 8 0 0 1 16 0M28 72V44a6 6 0 0 1 6-6h52a6 6 0 0 1 6 6v28M24 86v8M96 86v8",
  biombos: "M16 26l22 6v66l-22-6zM38 32l22-6v66l-22 6zM60 26l22 6v66l-22-6zM82 32l22-6v66l-22 6z",
  ocio: "M60 18a42 42 0 1 0 0.01 0M60 34a26 26 0 1 0 0.01 0M60 50a10 10 0 1 0 0.01 0M60 18v84M18 60h84",
  decoracion: "M60 14v12M48 26h24M50 26l-6 14h32l-6-14M44 40c-6 10-6 34 0 46h32c6-12 6-36 0-46M44 86l4 12h24l4-12M60 52v18",
  iluminacion: "M8 30c18 22 34 22 52 0s34-22 52 0M24 40v8M42 44v8M60 30v8M78 44v8M96 40v8M20 48a4 4 0 1 0 8 0M38 52a4 4 0 1 0 8 0M56 38a4 4 0 1 0 8 0M74 52a4 4 0 1 0 8 0M92 48a4 4 0 1 0 8 0",
  audiovisuales: "M18 28h84v52H18zM48 80l-6 18M72 80l6 18M36 98h48",
  otros: "M24 44l36-18 36 18-36 18zM24 44v36l36 18 36-18V44M60 62v36",
};

export function Silueta({ slug, className = "" }: { slug?: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={TRAZOS[slug ?? ""] ?? TRAZOS.otros} />
    </svg>
  );
}

/** Marco de imagen sin foto: papel arena con el dibujo de la categoría */
export function SinFoto({ slug, codigo, compacto }: { slug?: string | null; codigo?: string | null; compacto?: boolean }) {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(120%_90%_at_30%_20%,#f4ece1,#e3d5c2_70%,#d9c9b4)]">
      <div className="absolute inset-3 rounded-[10px] border border-dashed border-bronze/30" />
      <Silueta slug={slug} className={`${compacto ? "h-10 w-10" : "h-24 w-24"} text-olive/45 transition-transform duration-700 group-hover:scale-105`} />
      {!compacto && (
        <p className="absolute bottom-5 left-0 right-0 text-center text-[9px] uppercase tracking-[0.32em] text-espresso/40">
          {codigo ? `${codigo} · ` : ""}Foto pendiente
        </p>
      )}
    </div>
  );
}
