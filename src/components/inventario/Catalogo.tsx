import Link from "next/link";
import { Suspense } from "react";
import { type Categoria, type Item, DISPONIBILIDAD, ESTADOS, RANGOS_CANTIDAD, confirmadas, enRango, esPendiente } from "@/lib/inventario";
import { FichaTabla, FichaTarjeta } from "./Fichas";
import { FiltrosCatalogo } from "./FiltrosCatalogo";

export type ParamsCatalogo = { cat?: string; q?: string; estado?: string; disp?: string; ubic?: string; cant?: string; pend?: string; vista?: string };

const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function filtrar(items: Item[], p: ParamsCatalogo, catId?: string) {
  const q = sinAcentos(p.q ?? "");
  return items.filter((i) =>
    (!catId || i.categoria_id === catId) &&
    (!q || sinAcentos(`${i.nombre} ${i.codigo ?? ""}`).includes(q)) &&
    (!p.estado || i.estado === p.estado) &&
    (!p.disp || (p.disp === "__pend" ? !i.disponibilidad : i.disponibilidad === p.disp)) &&
    (!p.ubic || (p.ubic === "__sin" ? !i.ubicacion : i.ubicacion === p.ubic)) &&
    enRango(i, p.cant ?? "") &&
    (!p.pend || esPendiente(i)));
}

export function CatalogoInventario({ categorias, items, p, crear }: { categorias: Categoria[]; items: Item[]; p: ParamsCatalogo; crear: boolean }) {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const catSel = categorias.find((c) => c.slug === p.cat);
  const lista = filtrar(items, p, catSel?.id);
  const tabla = p.vista === "tabla";
  const qs = (extra: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...p, ...extra }).filter(([, v]) => v) as [string, string][]);
    const t = u.toString();
    return `/inventario/catalogo${t ? `?${t}` : ""}`;
  };
  const ubicaciones = [...new Set(items.map((i) => i.ubicacion).filter(Boolean) as string[])].sort();
  const grupos = categorias.map((c) => ({ c, lista: lista.filter((i) => i.categoria_id === c.id) })).filter((g) => g.lista.length);
  const sinCat = lista.filter((i) => !i.categoria_id || !porId.has(i.categoria_id));

  return (
    <div className="max-w-7xl space-y-8">
      <header className="aparecer flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link href="/inventario" className="text-xs text-olive hover:text-bronze">← Panel de inventario</Link>
          <p className="antetitulo mt-4">Catálogo</p>
          <h1 className="mt-2 font-serif text-5xl leading-none md:text-6xl">{catSel ? catSel.nombre : <>El <em className="text-olive">material</em></>}</h1>
          <p className="mt-3 text-sm text-espresso/60">
            {lista.length} {lista.length === 1 ? "referencia" : "referencias"} · {lista.reduce((s, i) => s + confirmadas(i), 0).toLocaleString("es-ES")} uds. confirmadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <a href={`/inventario/exportar${catSel ? `?cat=${catSel.slug}` : ""}`} className="rounded-full px-3 py-2 text-espresso/70 transition hover:bg-cream/70 hover:text-espresso">Excel ↓</a>
            <a href={`/inventario-pdf${catSel ? `?cat=${catSel.slug}` : ""}`} target="_blank" className="rounded-full px-3 py-2 text-espresso/70 transition hover:bg-cream/70 hover:text-espresso">PDF ↓</a>
          </div>
          <nav className="flex rounded-full bg-stone/35 p-1 text-sm" aria-label="Vista">
            <Link href={qs({ vista: undefined })} className={`rounded-full px-4 py-1.5 transition ${!tabla ? "bg-cream shadow-sm" : "text-espresso/60 hover:text-espresso"}`}>Fichas</Link>
            <Link href={qs({ vista: "tabla" })} className={`rounded-full px-4 py-1.5 transition ${tabla ? "bg-cream shadow-sm" : "text-espresso/60 hover:text-espresso"}`}>Tabla</Link>
          </nav>
          {crear && <Link href="/inventario/nuevo" className="rounded-full bg-olive-deep px-5 py-2.5 text-sm text-cream transition hover:bg-espresso">+ Añadir</Link>}
        </div>
      </header>

      {/* Categorías */}
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" aria-label="Categorías">
        <Link href={qs({ cat: undefined })} className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${!catSel ? "bg-espresso text-cream" : "bg-cream/60 text-espresso/70 hover:bg-cream"}`}>Todo</Link>
        {categorias.map((c) => {
          const n = items.filter((i) => i.categoria_id === c.id).length;
          return (
            <Link key={c.id} href={qs({ cat: c.slug })}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${catSel?.id === c.id ? "bg-espresso text-cream" : n ? "bg-cream/60 text-espresso/70 hover:bg-cream" : "text-espresso/35 hover:text-espresso/60"}`}>
              {c.nombre}<span className="ml-1.5 text-xs opacity-60">{n}</span>
            </Link>
          );
        })}
      </nav>

      <Suspense>
        <FiltrosCatalogo
          estados={Object.entries(ESTADOS).map(([v, t]) => ({ v, t }))}
          disponibilidad={[...Object.entries(DISPONIBILIDAD).map(([v, t]) => ({ v, t })), { v: "__pend", t: "Sin definir" }]}
          ubicaciones={ubicaciones} rangos={RANGOS_CANTIDAD} />
      </Suspense>

      {!lista.length ? (
        <div className="aparecer rounded-3xl border border-dashed border-stone px-6 py-20 text-center">
          <p className="font-serif text-3xl">Nada por aquí</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-espresso/60">
            {catSel && !items.some((i) => i.categoria_id === catSel.id) ? `Todavía no hay material en ${catSel.nombre.toLowerCase()}.` : "Ningún artículo coincide con la búsqueda o los filtros."}
          </p>
          {crear && <Link href="/inventario/nuevo" className="mt-6 inline-flex rounded-full bg-olive-deep px-5 py-2.5 text-sm text-cream hover:bg-espresso">Añadir material</Link>}
        </div>
      ) : tabla ? (
        <FichaTabla items={lista} cats={porId} />
      ) : (
        <div className="space-y-14">
          {[...grupos, ...(sinCat.length ? [{ c: { id: "", slug: "otros", nombre: "Sin categoría", orden: 99 } as Categoria, lista: sinCat }] : [])].map(({ c, lista: l }) => (
            <section key={c.id || "sin"} className="space-y-5">
              {!catSel && (
                <div className="flex items-baseline gap-4 border-b border-stone/60 pb-3">
                  <h2 className="font-serif text-3xl">{c.nombre}</h2>
                  <span className="text-sm text-espresso/45">{l.length}</span>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {l.map((i, k) => <FichaTarjeta key={i.id} i={i} cat={porId.get(i.categoria_id ?? "")} retardo={Math.min(k, 8) * 50} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
