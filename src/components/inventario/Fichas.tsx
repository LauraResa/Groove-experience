import Link from "next/link";
import { type Categoria, type Item, DISPONIBILIDAD, ESTADOS, cantidadTexto, esPendiente, fechaCorta, fotoUrl, fotos, medidas } from "@/lib/inventario";
import { SinFoto } from "./Silueta";

export function Etiqueta({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "pendiente" | "alerta" | "ok" }) {
  const cls = {
    neutro: "bg-cream/85 text-espresso/70",
    pendiente: "bg-cream/90 text-bronze border border-dashed border-bronze/60",
    alerta: "bg-[#7a3b2e] text-cream",
    ok: "bg-olive/90 text-cream",
  }[tono];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] backdrop-blur ${cls}`}>{children}</span>;
}

function Cantidad({ i, grande }: { i: Item; grande?: boolean }) {
  const c = cantidadTexto(i);
  return (
    <div className="text-right leading-none">
      <p className={`font-serif ${grande ? "text-5xl" : "text-3xl"} ${c.tipo === "confirmada" ? "text-espresso" : "italic text-bronze"}`}>{c.valor}</p>
      {c.nota && <p className={`mt-1 text-[10px] uppercase tracking-[0.18em] ${c.tipo === "confirmada" ? "text-espresso/45" : "text-bronze"}`}>{c.nota}</p>}
    </div>
  );
}

export function FichaTarjeta({ i, cat, retardo = 0 }: { i: Item; cat?: Categoria; retardo?: number }) {
  const f = fotos(i)[0];
  const pend = esPendiente(i);
  const med = medidas(i);
  return (
    <Link href={`/inventario/${i.id}`} style={{ animationDelay: `${retardo}ms` }}
      className={`group aparecer relative flex flex-col overflow-hidden rounded-2xl bg-cream/60 transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgb(46_42_38/0.5)] ${pend ? "border border-dashed border-bronze/55" : "border border-stone/60 hover:border-bronze/50"}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {f ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl(f.storage_path)} alt={i.nombre} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : <SinFoto slug={cat?.slug} codigo={i.codigo} />}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {pend && <Etiqueta tono="pendiente">Por confirmar</Etiqueta>}
          {(i.estado === "deteriorado" || i.estado === "fuera_servicio" || i.unidades_deterioradas > 0) && (
            <Etiqueta tono="alerta">{i.unidades_deterioradas > 0 && i.estado !== "fuera_servicio" ? `${i.unidades_deterioradas} deterioradas` : ESTADOS[i.estado]}</Etiqueta>
          )}
        </div>
        {fotos(i).length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-espresso/60 px-2 py-0.5 text-[10px] text-cream">{fotos(i).length} fotos</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-bronze">{cat?.nombre ?? "Sin categoría"}</p>
            <h3 className="mt-1.5 font-serif text-xl leading-snug">{i.nombre}</h3>
          </div>
          <Cantidad i={i} />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone/50 pt-3 text-xs text-espresso/55">
          {med && <span>{med}</span>}
          <span>{i.ubicacion ?? "Ubicación sin asignar"}</span>
          {i.pendiente && <span className="text-bronze">Falta: {i.pendiente.toLowerCase()}</span>}
          <span className="ml-auto inline-flex items-center gap-1 text-olive opacity-0 transition group-hover:opacity-100">Abrir ficha →</span>
        </div>
      </div>
    </Link>
  );
}

export function FichaTabla({ items, cats }: { items: Item[]; cats: Map<string, Categoria> }) {
  return (
    <div className="aparecer overflow-x-auto rounded-2xl bg-cream/55 ring-1 ring-stone/50">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-espresso/45">
            <th className="px-4 py-3 font-medium" colSpan={2}>Artículo</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 text-right font-medium">Cantidad</th>
            <th className="px-4 py-3 font-medium">Medidas</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Ubicación</th>
            <th className="px-4 py-3 font-medium">Disponibilidad</th>
            <th className="px-4 py-3 font-medium">Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const c = cantidadTexto(i);
            const cat = i.categoria_id ? cats.get(i.categoria_id) : undefined;
            const f = fotos(i)[0];
            return (
              <tr key={i.id} className="group border-t border-stone/40 transition hover:bg-sand/35">
                <td className="w-14 py-2 pl-4">
                  <div className="h-10 w-10 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f ? <img src={fotoUrl(f.storage_path)} alt="" className="h-full w-full object-cover" /> : <SinFoto slug={cat?.slug} compacto />}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/inventario/${i.id}`} className="font-medium group-hover:text-olive">{i.nombre}</Link>
                  {i.codigo && <p className="text-[11px] text-espresso/45">{i.codigo}</p>}
                </td>
                <td className="px-4 py-2 text-espresso/70">{cat?.nombre ?? "—"}</td>
                <td className={`px-4 py-2 text-right ${c.tipo === "confirmada" ? "font-medium" : "italic text-bronze"}`}>
                  {c.valor}{c.tipo !== "confirmada" && <span className="block text-[10px] not-italic uppercase tracking-[0.14em]">{c.nota}</span>}
                </td>
                <td className="px-4 py-2 text-espresso/70">{medidas(i) ?? "—"}</td>
                <td className="px-4 py-2">{ESTADOS[i.estado] ?? i.estado}{i.unidades_deterioradas > 0 && <span className="block text-[11px] text-[#7a3b2e]">{i.unidades_deterioradas} deterioradas</span>}</td>
                <td className="px-4 py-2 text-espresso/70">{i.ubicacion ?? "—"}</td>
                <td className="px-4 py-2">{esPendiente(i) && !i.disponibilidad ? <span className="text-bronze">Por confirmar</span> : DISPONIBILIDAD[i.disponibilidad ?? ""] ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-espresso/55">{fechaCorta(i.actualizado_en)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
