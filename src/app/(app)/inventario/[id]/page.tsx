import Link from "next/link";
import { notFound } from "next/navigation";
import { getSesion, puede } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";
import { type Categoria, type Item, DISPONIBILIDAD, ESTADOS, SELECT_ITEM, cantidadTexto, esPendiente, fechaCorta, fotoUrl, fotos, medidas } from "@/lib/inventario";
import { Cajon } from "@/components/Cajon";
import { FormItem } from "@/components/inventario/FormItem";
import { Galeria } from "@/components/inventario/Galeria";
import { Etiqueta } from "@/components/inventario/Fichas";
import { borrarItem, duplicarItem, marcarEstado } from "../actions";

const OK: Record<string, string> = { creado: "Artículo creado. Añade fotos cuando las tengas.", guardado: "Cambios guardados.", duplicado: "Ficha duplicada. Revisa el nombre y la cantidad." };

export default async function Ficha({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "inventario")) notFound();
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data }, { data: cats }, { data: ubs }] = await Promise.all([
    supabase.from("inventario_items").select(SELECT_ITEM).eq("id", id).maybeSingle(),
    supabase.from("inventario_categorias").select("id, slug, nombre, orden").order("orden"),
    supabase.from("inventario_items").select("ubicacion").not("ubicacion", "is", null),
  ]);
  if (!data) notFound();
  const i = data as Item;
  const categorias = (cats ?? []) as Categoria[];
  const cat = categorias.find((c) => c.id === i.categoria_id);
  const ubicaciones = [...new Set((ubs ?? []).map((u) => u.ubicacion as string))].sort();
  const editar = puede(s, "inventario", "editar");
  const c = cantidadTexto(i);
  const pend = esPendiente(i);

  const datos: [string, React.ReactNode][] = [
    ["Medidas", medidas(i) ?? "—"],
    ["Material", i.material ?? "—"],
    ["Color", i.color ?? "—"],
    ["Estado", <>{ESTADOS[i.estado]}{i.unidades_deterioradas > 0 && <span className="block text-xs text-[#7a3b2e]">{i.unidades_deterioradas} uds. deterioradas</span>}</>],
    ["Ubicación", i.ubicacion ?? "Sin asignar"],
    ["Disponibilidad", i.disponibilidad ? DISPONIBILIDAD[i.disponibilidad] : <span className="text-bronze">Sin definir</span>],
  ];

  return (
    <div className="max-w-7xl space-y-8">
      <div className="aparecer flex flex-wrap items-center justify-between gap-3">
        <Link href={`/inventario/catalogo${cat ? `?cat=${cat.slug}` : ""}`} className="text-xs text-olive hover:text-bronze">← {cat?.nombre ?? "Catálogo"}</Link>
        {editar && (
          <div className="flex flex-wrap items-center gap-2">
            <Cajon variante="secundario" boton="Editar ficha" titulo="Editar ficha">
              <FormItem item={i} categorias={categorias} ubicaciones={ubicaciones} />
            </Cajon>
            <Cajon variante="secundario" boton="Marcar estado" titulo="Estado del material">
              <form action={marcarEstado} className="space-y-4">
                <input type="hidden" name="_id" value={i.id} />
                <div className="grid gap-2">
                  {Object.entries(ESTADOS).map(([k, t]) => (
                    <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone/60 bg-cream/60 px-4 py-3 text-sm has-[:checked]:border-olive has-[:checked]:bg-sand/50">
                      <input type="radio" name="estado" value={k} defaultChecked={i.estado === k} className="accent-[#6f7458]" />{t}
                    </label>
                  ))}
                </div>
                <label className="block text-sm">Unidades deterioradas
                  <input name="unidades_deterioradas" type="number" min={0} defaultValue={i.unidades_deterioradas} className="mt-1 w-full rounded-lg border border-stone bg-cream/80 px-3 py-2" />
                  <span className="mt-1 block text-xs text-espresso/55">No cuentan como material disponible para eventos.</span>
                </label>
                <button className="w-full rounded-full bg-olive-deep py-3 text-sm text-cream hover:bg-espresso">Guardar estado</button>
              </form>
            </Cajon>
            {puede(s, "inventario", "crear") && (
              <form action={duplicarItem}><input type="hidden" name="_id" value={i.id} />
                <button className="inline-flex items-center rounded-lg border border-stone bg-cream/70 px-4 py-2 text-sm transition hover:border-olive">Duplicar</button>
              </form>
            )}
            {puede(s, "inventario", "borrar") && (
              <form action={borrarItem} data-confirmar><input type="hidden" name="_id" value={i.id} />
                <button className="rounded-lg px-3 py-2 text-sm text-[#7a3b2e] transition hover:bg-[#7a3b2e]/10">Eliminar</button>
              </form>
            )}
          </div>
        )}
      </div>

      {error && <p className="aparecer rounded-2xl border border-[#7a3b2e]/40 bg-[#7a3b2e]/10 px-5 py-3 text-sm text-[#7a3b2e]">{error}</p>}
      {ok && OK[ok] && <p className="aparecer rounded-2xl border border-olive/40 bg-olive/10 px-5 py-3 text-sm text-olive-deep">{OK[ok]}</p>}

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <Galeria itemId={i.id} editable={editar} slug={cat?.slug} codigo={i.codigo} nombre={i.nombre}
          fotos={fotos(i).map((f) => ({ id: f.id, url: fotoUrl(f.storage_path) }))} />

        <div className="aparecer space-y-8" style={{ animationDelay: "80ms" }}>
          <div>
            <p className="antetitulo">{cat?.nombre ?? "Sin categoría"}{i.codigo && <span className="tracking-[0.2em] text-espresso/40">· {i.codigo}</span>}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{i.nombre}</h1>
            {i.descripcion && <p className="mt-4 text-[15px] text-espresso/70">{i.descripcion}</p>}
          </div>

          <div className={`flex items-end justify-between gap-6 rounded-3xl p-6 ${c.tipo === "confirmada" ? "sidebar-fondo text-cream" : "border border-dashed border-bronze/60 bg-bronze/5"}`}>
            <div>
              <p className={`text-[10px] uppercase tracking-[0.28em] ${c.tipo === "confirmada" ? "text-cream/65" : "text-bronze"}`}>
                {c.tipo === "confirmada" ? "Stock confirmado" : c.tipo === "estimada" ? "Cantidad estimada · no computa" : "Cantidad sin registrar"}
              </p>
              <p className={`mt-2 font-serif text-6xl leading-none ${c.tipo === "confirmada" ? "" : "italic text-bronze"}`}>{c.valor}</p>
            </div>
            <p className={`pb-1 text-sm ${c.tipo === "confirmada" ? "text-cream/70" : "text-bronze"}`}>{c.tipo === "confirmada" ? i.unidad : c.nota}</p>
          </div>

          {pend && (
            <div className="flex items-start gap-3">
              <Etiqueta tono="pendiente">Por confirmar</Etiqueta>
              <p className="text-sm text-espresso/70">{i.pendiente ?? "Cantidad"}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
            {datos.map(([k, val]) => (
              <div key={k} className="border-t border-stone/60 pt-3">
                <dt className="text-[10px] uppercase tracking-[0.24em] text-espresso/45">{k}</dt>
                <dd className="mt-1 text-[15px]">{val}</dd>
              </div>
            ))}
          </dl>
          {i.medidas_nota && <p className="text-sm text-espresso/60">{i.medidas_nota}</p>}

          {i.observaciones && (
            <div className="border-l-2 border-bronze/50 pl-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-espresso/45">Observaciones</p>
              <p className="mt-1.5 whitespace-pre-line text-[15px] text-espresso/80">{i.observaciones}</p>
            </div>
          )}
          <p className="text-xs text-espresso/45">Última actualización: {fechaCorta(i.actualizado_en)}</p>
        </div>
      </div>
    </div>
  );
}
