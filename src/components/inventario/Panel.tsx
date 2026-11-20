import Link from "next/link";
import { type Categoria, type Item, cantidadTexto, confirmadas, esPendiente, fechaCorta, fotoUrl, fotos, utilizables } from "@/lib/inventario";
import { Silueta, SinFoto } from "./Silueta";

const fmt = (n: number) => n.toLocaleString("es-ES");

export function PanelInventario({ categorias, items, crear }: { categorias: Categoria[]; items: Item[]; crear: boolean }) {
  const totalConf = items.reduce((s, i) => s + confirmadas(i), 0);
  const disponibles = items.reduce((s, i) => s + utilizables(i), 0);
  const pendientes = items.filter(esPendiente);
  const recientes = [...items].sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en)).slice(0, 5);
  const conMaterial = categorias.filter((c) => items.some((i) => i.categoria_id === c.id)).length;
  const sinFoto = items.filter((i) => !fotos(i).length).length;

  return (
    <div className="max-w-7xl space-y-14">
      {/* Cabecera editorial */}
      <header className="aparecer grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="antetitulo">Producción · Inventario</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.02] md:text-7xl">
            Todo lo que <em className="text-olive">montamos</em>,<br className="hidden md:block" /> en un solo sitio
          </h1>
          <p className="mt-5 max-w-xl text-[15px] text-espresso/65">
            Mobiliario, ocio y material propio de Groove. Las cantidades sin verificar aparecen aparte y no suman al stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/inventario/catalogo" className="inline-flex items-center gap-2 rounded-full border border-stone bg-cream/70 px-5 py-3 text-sm transition hover:border-olive">
            Ver catálogo
          </Link>
          {crear && (
            <Link href="/inventario/nuevo" className="group inline-flex items-center gap-3 rounded-full bg-olive-deep py-3 pl-5 pr-3 text-sm text-cream shadow-lg shadow-olive-deep/25 transition hover:bg-espresso">
              Añadir material
              <span className="grid h-7 w-7 place-items-center rounded-full bg-cream/15 transition-transform duration-500 group-hover:rotate-90">+</span>
            </Link>
          )}
        </div>
      </header>

      {/* Cifras */}
      <section className="aparecer grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-stone/60 bg-stone/50 md:grid-cols-5" style={{ animationDelay: "80ms" }}>
        <div className="col-span-2 sidebar-fondo p-6 text-cream md:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-cream/65">Unidades confirmadas</p>
          <p className="mt-3 font-serif text-6xl leading-none">{fmt(totalConf)}</p>
          <p className="mt-3 text-xs text-cream/60">Solo stock verificado</p>
        </div>
        {[
          { l: "Referencias", v: items.length, s: `${sinFoto} sin fotografía` },
          { l: "Categorías", v: categorias.length, s: `${conMaterial} con material` },
          { l: "Por confirmar", v: pendientes.length, s: "cantidad o datos", tono: "text-bronze italic", href: "/inventario/catalogo?pend=1" },
          { l: "Disponible para eventos", v: disponibles, s: "uds. sin incidencias" },
        ].map((k) => {
          const cuerpo = (
            <>
              <p className="text-[10px] uppercase tracking-[0.28em] text-espresso/50">{k.l}</p>
              <p className={`mt-3 font-serif text-5xl leading-none ${k.tono ?? ""}`}>{fmt(k.v)}</p>
              <p className="mt-3 text-xs text-espresso/50">{k.s}</p>
            </>
          );
          return k.href
            ? <Link key={k.l} href={k.href} className="bg-[#f1e9de] p-6 transition hover:bg-sand/60">{cuerpo}</Link>
            : <div key={k.l} className="bg-[#f1e9de] p-6">{cuerpo}</div>;
        })}
      </section>

      {/* Categorías */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl">Por <em className="text-olive">categoría</em></h2>
          <Link href="/inventario/catalogo" className="text-sm text-olive hover:text-bronze">Catálogo completo →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.map((c, k) => {
            const del = items.filter((i) => i.categoria_id === c.id);
            const uds = del.reduce((s, i) => s + confirmadas(i), 0);
            const pend = del.filter(esPendiente).length;
            return (
              <Link key={c.id} href={`/inventario/catalogo?cat=${c.slug}`} style={{ animationDelay: `${120 + k * 40}ms` }}
                className={`group aparecer relative overflow-hidden rounded-2xl border p-5 transition duration-500 hover:-translate-y-1 hover:border-bronze/60 hover:bg-cream/80 ${del.length ? "border-stone/60 bg-cream/55" : "border-dashed border-stone/70 bg-transparent"}`}>
                <span className="absolute right-4 top-4 font-serif text-sm text-espresso/25">{String(k + 1).padStart(2, "0")}</span>
                <Silueta slug={c.slug} className={`h-12 w-12 transition duration-500 group-hover:-rotate-3 group-hover:text-olive ${del.length ? "text-olive/70" : "text-espresso/25"}`} />
                <p className="mt-6 font-serif text-lg leading-tight">{c.nombre}</p>
                <p className="mt-1.5 text-xs text-espresso/55">
                  {del.length ? <>{del.length} ref. · {fmt(uds)} uds.{pend > 0 && <span className="text-bronze"> · {pend} por confirmar</span>}</> : "Sin material todavía"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        {/* Pendientes */}
        <section className="space-y-4">
          <h2 className="font-serif text-3xl">Pendiente de <em className="text-bronze">confirmar</em></h2>
          {pendientes.length ? (
            <ul className="divide-y divide-dashed divide-bronze/30 border-y border-dashed border-bronze/30">
              {pendientes.map((i) => {
                const c = cantidadTexto(i);
                return (
                  <li key={i.id}>
                    <Link href={`/inventario/${i.id}`} className="group flex items-center gap-4 py-3.5 transition hover:pl-2">
                      <span className="h-2 w-2 shrink-0 rounded-full border border-bronze" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium group-hover:text-olive">{i.nombre}</p>
                        <p className="text-xs text-espresso/55">Falta: {(i.pendiente ?? "cantidad").toLowerCase()}</p>
                      </div>
                      <span className="font-serif italic text-bronze">{c.tipo === "confirmada" ? `${c.valor} ${c.nota ?? ""}` : c.tipo === "estimada" ? `${c.valor} est.` : "—"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-espresso/55">Todo el inventario está verificado.</p>}
        </section>

        {/* Últimos cambios */}
        <section className="space-y-4">
          <h2 className="font-serif text-3xl">Últimos <em className="text-olive">cambios</em></h2>
          <ul className="space-y-2">
            {recientes.map((i) => {
              const f = fotos(i)[0];
              const cat = categorias.find((c) => c.id === i.categoria_id);
              return (
                <li key={i.id}>
                  <Link href={`/inventario/${i.id}`} className="group flex items-center gap-4 rounded-2xl p-2 transition hover:bg-cream/70">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {f ? <img src={fotoUrl(f.storage_path)} alt="" className="h-full w-full object-cover" /> : <SinFoto slug={cat?.slug} compacto />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium group-hover:text-olive">{i.nombre}</p>
                      <p className="text-xs text-espresso/50">{cat?.nombre} · {fechaCorta(i.actualizado_en)}</p>
                    </div>
                    <span className="text-espresso/30 transition group-hover:translate-x-1 group-hover:text-olive">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
