import { notFound } from "next/navigation";
import { getSesion, puede } from "@/lib/sesion";
import { DISPONIBILIDAD, ESTADOS, cantidadTexto, confirmadas, esPendiente, fotoUrl, fotos, medidas } from "@/lib/inventario";
import { SinFoto } from "@/components/inventario/Silueta";
import { cargarInventario } from "../(app)/inventario/datos";
import { Imprimir } from "./Imprimir";

export const metadata = { title: "Catálogo de inventario · The Groove Experience" };

/** Catálogo imprimible (A4) del inventario completo o de una categoría */
export default async function CatalogoPdf({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "inventario")) notFound();
  const [{ cat: slug }, { categorias, items }] = await Promise.all([searchParams, cargarInventario()]);
  const cat = categorias.find((c) => c.slug === slug);
  const grupos = (cat ? [cat] : categorias).map((c) => ({ c, l: items.filter((i) => i.categoria_id === c.id) })).filter((g) => g.l.length);
  const todos = grupos.flatMap((g) => g.l);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

  return (
    <div className="bg-[#d9d2c7] print:bg-transparent">
      <style>{`
        @page { size: A4; margin: 0 }
        @media print { .no-print { display: none !important } body::before { display: none } }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #d9d2c7 }
        .hoja { width: 210mm; min-height: 297mm; margin: 0 auto 8mm; background: #f4eee5; position: relative; overflow: hidden; break-after: page }
        @media print { .hoja { margin: 0; box-shadow: none } body { background: none } }
        .ficha { break-inside: avoid }
      `}</style>
      <Imprimir volver={cat ? `/inventario/catalogo?cat=${cat.slug}` : "/inventario/catalogo"} />

      {/* Portada */}
      <section className="hoja sidebar-fondo flex flex-col justify-between p-[18mm] text-[#ede4d8] shadow-xl">
        <div className="flex justify-between text-[8pt] uppercase tracking-[0.4em] opacity-75"><span>The Groove Experience</span><span>Uso interno</span></div>
        <div>
          <p className="text-[9pt] uppercase tracking-[0.4em] text-[#d9c9b4]">Catálogo de inventario</p>
          <h1 className="mt-4 font-serif text-[52pt] leading-[1.02]">{cat ? cat.nombre : <>Material<br /><em className="text-[#d9c9b4]">de Groove</em></>}</h1>
          <div className="mt-10 grid max-w-[140mm] grid-cols-3 gap-6 border-t border-[#ede4d8]/25 pt-6">
            <div><p className="font-serif text-[30pt] leading-none">{todos.reduce((a, i) => a + confirmadas(i), 0).toLocaleString("es-ES")}</p><p className="mt-2 text-[7.5pt] uppercase tracking-[0.25em] opacity-70">Uds. confirmadas</p></div>
            <div><p className="font-serif text-[30pt] leading-none">{todos.length}</p><p className="mt-2 text-[7.5pt] uppercase tracking-[0.25em] opacity-70">Referencias</p></div>
            <div><p className="font-serif text-[30pt] italic leading-none text-[#d9c9b4]">{todos.filter(esPendiente).length}</p><p className="mt-2 text-[7.5pt] uppercase tracking-[0.25em] opacity-70">Por confirmar</p></div>
          </div>
        </div>
        <div className="flex justify-between text-[8pt] tracking-[0.2em] opacity-70"><span>Actualizado el {fecha}</span><span>{grupos.map((g) => g.c.nombre).join(" · ")}</span></div>
      </section>

      {grupos.map(({ c, l }, gi) => (
        <section key={c.id} className="hoja p-[16mm] shadow-xl">
          <div className="flex items-baseline justify-between border-b border-[#2e2a26]/30 pb-3">
            <h2 className="font-serif text-[26pt] leading-none">{c.nombre}</h2>
            <span className="text-[8pt] uppercase tracking-[0.3em] text-[#a3835b]">{String(gi + 1).padStart(2, "0")} · {l.length} ref.</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-[8mm] gap-y-[7mm]">
            {l.map((i) => {
              const f = fotos(i)[0];
              const q = cantidadTexto(i);
              return (
                <article key={i.id} className="ficha">
                  <div className={`h-[44mm] overflow-hidden rounded-[3mm] ${esPendiente(i) ? "outline-1 outline-dashed outline-[#a3835b]/70" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f ? <img src={fotoUrl(f.storage_path)} alt="" className="h-full w-full object-cover" /> : <SinFoto slug={c.slug} codigo={i.codigo} />}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[7pt] uppercase tracking-[0.25em] text-[#a3835b]">{i.codigo ?? c.nombre}{esPendiente(i) && " · por confirmar"}</p>
                      <h3 className="mt-1 font-serif text-[13pt] leading-tight">{i.nombre}</h3>
                    </div>
                    <div className="text-right">
                      <p className={`font-serif text-[20pt] leading-none ${q.tipo === "confirmada" ? "" : "italic text-[#a3835b]"}`}>{q.valor}</p>
                      <p className="mt-1 text-[6.5pt] uppercase tracking-[0.18em] text-[#2e2a26]/55">{q.nota}</p>
                    </div>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[#2e2a26]/15 pt-2 text-[7.5pt] text-[#2e2a26]/75">
                    <div><dt className="inline text-[#2e2a26]/45">Medidas </dt><dd className="inline">{medidas(i) ?? "—"}</dd></div>
                    <div><dt className="inline text-[#2e2a26]/45">Estado </dt><dd className="inline">{ESTADOS[i.estado]}</dd></div>
                    <div><dt className="inline text-[#2e2a26]/45">Material </dt><dd className="inline">{[i.material, i.color].filter(Boolean).join(", ") || "—"}</dd></div>
                    <div><dt className="inline text-[#2e2a26]/45">Ubicación </dt><dd className="inline">{i.ubicacion ?? "—"}</dd></div>
                    <div className="col-span-2"><dt className="inline text-[#2e2a26]/45">Disponibilidad </dt><dd className="inline">{i.disponibilidad ? DISPONIBILIDAD[i.disponibilidad] : "Sin definir"}</dd></div>
                  </dl>
                  {(i.pendiente || i.observaciones) && <p className="mt-1.5 text-[7pt] leading-snug text-[#2e2a26]/60">{i.pendiente && <b className="font-medium text-[#a3835b]">Falta: {i.pendiente.toLowerCase()}. </b>}{i.observaciones}</p>}
                </article>
              );
            })}
          </div>
          <p className="absolute bottom-[8mm] left-[16mm] right-[16mm] flex justify-between text-[6.5pt] uppercase tracking-[0.35em] text-[#2e2a26]/45"><span>The Groove Experience · Inventario</span><span>{fecha}</span></p>
        </section>
      ))}
    </div>
  );
}
