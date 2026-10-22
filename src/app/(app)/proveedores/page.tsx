import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { eur } from "@/lib/fechas";
import { BLOQUES } from "@/lib/estados";
import { Cabecera, Campo, Filtros, Insignia, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

export default async function Proveedores({ searchParams }: { searchParams: Promise<{ vista?: string; cat?: string; q?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "proveedores")) notFound();
  const { vista = "", cat = "", q = "" } = await searchParams;
  const importes = puede(s, "proveedores", "ver_importes");
  const crear = puede(s, "proveedores", "crear");
  const supabase = await createClient();

  const [{ data: cats }, { data: provs }, { data: items }] = await Promise.all([
    supabase.from("categorias_proveedor").select("id, nombre").order("orden"),
    supabase.from("proveedores").select("id, empresa, contacto, telefono, email, tipo, valoracion, servicios, categoria_id, evento_proveedores(id)").order("empresa"),
    importes ? supabase.from("catalogo_items").select("id, nombre, bloque, unidad, precio, coste, condiciones, activo, vigente_hasta, proveedor_id, proveedores(empresa)").order("nombre") : Promise.resolve({ data: [] }),
  ]);
  const lista = (provs ?? []).filter((p) => (!cat || p.categoria_id === cat) && (!q || p.empresa.toLowerCase().includes(q.toLowerCase())));
  const catNombre = new Map((cats ?? []).map((c) => [c.id, c.nombre]));

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Producción" titulo="Proveedores" sub="Proveedores Groove y propios, con su catálogo de servicios y tarifas.">
        {crear && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Nuevo proveedor</>} titulo="Nuevo proveedor">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "proveedores", _volver: "/proveedores", _ir: "/proveedores/" }} />
              <Campo t="Empresa"><input name="empresa" required className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Categoría"><Sel name="categoria_id" ops={cats ?? []} vacio="—" /></Campo>
                <Campo t="Tipo"><Sel name="tipo" ops={[{ id: "propio", nombre: "Propio" }, { id: "groove", nombre: "Proveedor Groove" }]} /></Campo>
                <Campo t="Contacto"><input name="contacto" className={campo} /></Campo>
                <Campo t="Teléfono"><input name="telefono" className={campo} /></Campo>
                <Campo t="Email"><input name="email" type="email" className={campo} /></Campo>
                <Campo t="Web"><input name="web" className={campo} /></Campo>
              </div>
              <Campo t="Servicios"><textarea name="servicios" rows={2} className={campo} /></Campo>
              <button className={`${boton} w-full`}>Crear proveedor</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      {importes && <Filtros base="/proveedores" actual={vista} param="vista" ops={[{ v: "", t: "Proveedores", n: provs?.length }, { v: "catalogo", t: "Catálogo y tarifas", n: items?.length }]} />}

      {vista === "catalogo" && importes ? (
        <Tarjeta sinPadding>
          {items?.length ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                <th className="px-5 py-3 font-medium">Servicio</th><th className="px-5 py-3 font-medium">Proveedor</th><th className="px-5 py-3 font-medium">Bloque</th>
                <th className="px-5 py-3 text-right font-medium">Precio</th><th className="px-5 py-3 text-right font-medium">Coste</th><th className="px-5 py-3 text-right font-medium">Margen</th>
              </tr></thead>
              <tbody>{items.map((i) => {
                const m = i.precio && i.coste ? Math.round(((Number(i.precio) - Number(i.coste)) / Number(i.precio)) * 100) : null;
                return (
                  <tr key={i.id} className={`border-t border-stone/40 ${i.activo ? "" : "opacity-50"}`}>
                    <td className="px-5 py-2.5"><p className="font-medium">{i.nombre}</p>{i.condiciones && <p className="text-xs text-espresso/55">{i.condiciones}</p>}</td>
                    <td className="px-5 py-2.5"><Link href={`/proveedores/${i.proveedor_id}`} className="hover:text-olive">{(i.proveedores as unknown as { empresa: string } | null)?.empresa ?? "—"}</Link></td>
                    <td className="px-5 py-2.5"><Insignia tono="apagado">{BLOQUES[i.bloque]}</Insignia></td>
                    <td className="px-5 py-2.5 text-right">{i.precio ? `${eur(i.precio)}/${i.unidad}` : "—"}</td>
                    <td className="px-5 py-2.5 text-right text-espresso/60">{i.coste ? eur(i.coste) : "—"}</td>
                    <td className="px-5 py-2.5 text-right">{m !== null ? `${m} %` : "—"}</td>
                  </tr>);
              })}</tbody>
            </table></div>
          ) : <Vacio>El catálogo se rellena desde la ficha de cada proveedor (menús, tarifas, alojamiento…).</Vacio>}
        </Tarjeta>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <form className="flex flex-wrap gap-2">
              <select name="cat" defaultValue={cat} className={`${campo} w-48`}>
                <option value="">Todas las categorías</option>
                {(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input name="q" defaultValue={q} placeholder="Buscar proveedor…" className={`${campo} w-52`} />
              <button className={boton}>Filtrar</button>
            </form>
          </div>
          {lista.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((p) => (
                <Link key={p.id} href={`/proveedores/${p.id}`} className="tarjeta tarjeta-viva aparecer block p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate font-medium">{p.empresa}</p><p className="text-xs text-espresso/55">{catNombre.get(p.categoria_id) ?? "Sin categoría"}</p></div>
                    <Insignia tono={p.tipo === "groove" ? "olive" : "neutro"}>{p.tipo === "groove" ? "Groove" : "Propio"}</Insignia>
                  </div>
                  {p.servicios && <p className="mt-2 line-clamp-2 text-sm text-espresso/70">{p.servicios}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-espresso/55">
                    <span>{p.contacto ?? p.telefono ?? p.email ?? ""}</span>
                    <span>{p.valoracion ? "★".repeat(p.valoracion) : ""} · {(p.evento_proveedores ?? []).length} eventos</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <Tarjeta><Vacio>No hay proveedores{q || cat ? " con este filtro" : ""}.</Vacio></Tarjeta>}
        </>
      )}
    </div>
  );
}
