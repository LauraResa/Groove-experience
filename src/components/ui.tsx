import Link from "next/link";
import { Icono } from "@/app/(app)/Icono";

export const campo = "w-full rounded-lg border border-stone bg-cream/80 px-3 py-2 text-sm outline-none focus:border-olive disabled:opacity-70";
export const boton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep transition disabled:opacity-60";
export const botonSec = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone bg-cream/70 px-4 py-2 text-sm hover:border-olive transition";
export const botonMini = "rounded-md bg-olive px-2.5 py-1 text-xs text-cream hover:bg-olive-deep transition";

export function Cabecera({ ante, titulo, sub, children, volver }: { ante?: string; titulo: string; sub?: React.ReactNode; children?: React.ReactNode; volver?: { href: string; txt: string } }) {
  return (
    <header className="aparecer space-y-2">
      {volver && <Link href={volver.href} className="inline-flex text-xs text-olive hover:text-bronze">← {volver.txt}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {ante && <p className="antetitulo">{ante}</p>}
          <h1 className="font-serif text-3xl md:text-4xl leading-tight mt-1">{titulo}</h1>
          {sub && <p className="mt-1 text-sm text-espresso/60">{sub}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </header>
  );
}

export function Tarjeta({ titulo, accion, children, className = "", sinPadding }: { titulo?: React.ReactNode; accion?: React.ReactNode; children: React.ReactNode; className?: string; sinPadding?: boolean }) {
  return (
    <section className={`tarjeta aparecer overflow-hidden ${className}`}>
      {titulo && (
        <div className="flex items-center justify-between gap-2 border-b border-stone/60 px-5 py-3.5">
          <h2 className="font-serif text-lg">{titulo}</h2>
          {accion}
        </div>
      )}
      <div className={sinPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Campo({ t, children, className = "" }: { t: string; children: React.ReactNode; className?: string }) {
  return <label className={`block space-y-1 ${className}`}><span className="text-xs text-espresso/60">{t}</span>{children}</label>;
}

export function Sel({ name, ops, valor, vacio, className = campo }: { name: string; ops: { id: string; nombre: string }[] | string[]; valor?: string | null; vacio?: string; className?: string }) {
  const lista = ops.map((o) => (typeof o === "string" ? { id: o, nombre: o } : o));
  return (
    <select name={name} defaultValue={valor ?? ""} className={className}>
      {vacio !== undefined && <option value="">{vacio}</option>}
      {lista.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
    </select>
  );
}

export function Check({ name, t, valor }: { name: string; t: string; valor?: boolean | null }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm">
      <input type="hidden" name="_b" value={name} />
      <input type="checkbox" name={name} defaultChecked={!!valor} className="accent-olive" />{t}
    </label>
  );
}

export function Ocultos({ v }: { v: Record<string, string | null | undefined> }) {
  return <>{Object.entries(v).map(([k, x]) => <input key={k} type="hidden" name={k} value={x ?? ""} />)}</>;
}

export function Insignia({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "olive" | "bronze" | "fuerte" | "apagado" }) {
  const c = { neutro: "bg-sand text-espresso/80", olive: "bg-olive/15 text-olive-deep", bronze: "bg-bronze/20 text-bronze", fuerte: "bg-olive text-cream", apagado: "bg-stone/40 text-espresso/55" }[tono];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${c}`}>{children}</span>;
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm italic text-espresso/50">{children}</p>;
}

export function Kpi({ icono, label, valor, sub, destacado }: { icono?: string; label: string; valor: React.ReactNode; sub?: string; destacado?: boolean }) {
  return (
    <div className={destacado ? "aparecer relative overflow-hidden rounded-2xl sidebar-fondo p-5 text-cream shadow-lg shadow-olive-deep/25" : "tarjeta tarjeta-viva aparecer p-5"}>
      <p className={`flex items-center gap-1.5 text-xs ${destacado ? "text-cream/75" : "text-espresso/60"}`}>{icono && <Icono n={icono} className="h-4 w-4" />}{label}</p>
      <p className="mt-2 font-serif text-3xl">{valor}</p>
      {sub && <p className={`mt-1 text-xs ${destacado ? "text-cream/70" : "text-espresso/55"}`}>{sub}</p>}
    </div>
  );
}

export function Filtros({ base, actual, ops, param = "f" }: { base: string; actual?: string; ops: { v: string; t: string; n?: number }[]; param?: string }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl bg-stone/30 p-1 w-fit">
      {ops.map((o) => {
        const sep = base.includes("?") ? "&" : "?";
        const activo = (actual ?? "") === o.v;
        return (
          <Link key={o.v} href={o.v ? `${base}${sep}${param}=${o.v}` : base}
            className={`rounded-lg px-3.5 py-1.5 text-sm transition ${activo ? "bg-cream shadow-sm font-medium" : "text-espresso/65 hover:text-espresso"}`}>
            {o.t}{o.n !== undefined && <span className="ml-1 text-espresso/45">{o.n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Aviso({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="tarjeta border-bronze/60 px-4 py-3 text-sm text-red-800">{error}</p>;
}
