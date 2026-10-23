import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar, guardar } from "@/lib/crud";
import { eur, fFecha } from "@/lib/fechas";
import { BLOQUES } from "@/lib/estados";
import { Aviso, Cabecera, Campo, Check, Insignia, Ocultos, Sel, Tarjeta, Vacio, boton, botonMini, campo } from "@/components/ui";
import { Comentarios } from "@/components/Comentarios";
import { DocumentosDe } from "@/components/Documentos";

const bloques = Object.entries(BLOQUES).map(([id, nombre]) => ({ id, nombre }));

export default async function Proveedor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "proveedores")) notFound();
  const editar = puede(s, "proveedores", "editar");
  const importes = puede(s, "proveedores", "ver_importes");
  const supabase = await createClient();
  const volver = `/proveedores/${id}`;

  const { data: p } = await supabase.from("proveedores").select("*, categorias_proveedor(nombre)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: cats }, { data: items }, { data: usos }, { data: cond }] = await Promise.all([
    supabase.from("categorias_proveedor").select("id, nombre").order("orden"),
    importes ? supabase.from("catalogo_items").select("*").eq("proveedor_id", id).order("nombre") : Promise.resolve({ data: [] }),
    supabase.from("evento_proveedores").select("id, servicio, valoracion, eventos(id, nombre, fecha)").eq("proveedor_id", id),
    importes ? supabase.from("proveedor_condiciones").select("condiciones").eq("proveedor_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: costes } = importes && usos?.length
    ? await supabase.from("evento_proveedores_costes").select("evento_proveedor_id, coste").in("evento_proveedor_id", usos.map((u) => u.id))
    : { data: [] as { evento_proveedor_id: string; coste: number | null }[] };
  const costeDe = new Map((costes ?? []).map((c) => [c.evento_proveedor_id, Number(c.coste ?? 0)]));

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera volver={{ href: "/proveedores", txt: "Proveedores" }} ante={(p.categorias_proveedor as { nombre: string } | null)?.nombre ?? "Proveedor"} titulo={p.empresa}
        sub={[p.contacto, p.telefono, p.email].filter(Boolean).join(" · ") || undefined}>
        <Insignia tono={p.tipo === "groove" ? "olive" : "neutro"}>{p.tipo === "groove" ? "Proveedor Groove" : "Proveedor propio"}</Insignia>
      </Cabecera>
      <Aviso error={error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {importes && (
            <Tarjeta titulo="Catálogo y tarifas" sinPadding>
              {items?.length ? (
                <div className="divide-y divide-stone/40">
                  {items.map((i) => (
                    <form key={i.id} action={guardar} className="grid grid-cols-2 items-center gap-2 px-5 py-2.5 md:grid-cols-[1.4fr_8rem_6rem_6rem_5rem_auto_auto]">
                      <Ocultos v={{ _tabla: "catalogo_items", _id: i.id, _volver: volver }} />
                      <input name="nombre" defaultValue={i.nombre} disabled={!editar} className={`${campo} py-1.5`} />
                      <Sel name="bloque" valor={i.bloque} ops={bloques} className={`${campo} py-1.5`} />
                      <input name="precio" type="number" step="0.01" defaultValue={i.precio ?? ""} title="Precio venta" disabled={!editar} className={`${campo} py-1.5`} />
                      <input name="coste" type="number" step="0.01" defaultValue={i.coste ?? ""} title="Coste" disabled={!editar} className={`${campo} py-1.5`} />
                      <input name="unidad" defaultValue={i.unidad} title="Unidad" disabled={!editar} className={`${campo} py-1.5`} />
                      <Check name="activo" t="Activo" valor={i.activo} />
                      {editar && <div className="flex gap-1"><button className={botonMini}>✓</button><button data-confirmar formAction={borrar} className="rounded-md border border-stone px-2 py-1 text-xs text-espresso/55 hover:text-red-800">×</button></div>}
                    </form>
                  ))}
                </div>
              ) : <Vacio>Añade menús, tarifas o servicios: se podrán usar al montar propuestas.</Vacio>}
              {editar && (
                <form action={guardar} className="grid grid-cols-2 gap-2 border-t border-stone/60 bg-cream/40 px-5 py-3 md:grid-cols-[1.4fr_8rem_6rem_6rem_5rem_auto]">
                  <Ocultos v={{ _tabla: "catalogo_items", _volver: volver, proveedor_id: id }} />
                  <input name="nombre" required placeholder="Ej. Menú Navidad A" className={campo} />
                  <Sel name="bloque" ops={bloques} valor="catering" />
                  <input name="precio" type="number" step="0.01" placeholder="Precio" className={campo} />
                  <input name="coste" type="number" step="0.01" placeholder="Coste" className={campo} />
                  <input name="unidad" defaultValue="pax" className={campo} />
                  <button className={botonMini}>Añadir</button>
                  <input name="condiciones" placeholder="Condiciones (mínimo de pax, incluye…, vigencia)" className={`${campo} col-span-2 md:col-span-6`} />
                </form>
              )}
            </Tarjeta>
          )}

          {(
            <Tarjeta titulo="Eventos en los que ha trabajado" sinPadding>
              {usos?.length ? (
                <table className="w-full text-sm"><tbody>
                  {usos.map((u) => { const e = u.eventos as unknown as { id: string; nombre: string; fecha: string } | null; return (
                    <tr key={u.id} className="border-t border-stone/40 first:border-t-0">
                      <td className="px-5 py-2.5 whitespace-nowrap text-espresso/60">{e ? fFecha(e.fecha) : ""}</td>
                      <td className="px-5 py-2.5"><Link href={`/eventos/${e?.id}`} className="hover:text-olive">{e?.nombre}</Link><p className="text-xs text-espresso/55">{u.servicio}</p></td>
                      {importes && <td className="px-5 py-2.5 text-right">{costeDe.get(u.id) ? eur(costeDe.get(u.id)) : "—"}</td>}
                    </tr>); })}
                </tbody></table>
              ) : <Vacio>Aún no se ha usado en ningún evento.</Vacio>}
            </Tarjeta>
          )}
          <Comentarios tipo="proveedor" id={id} volver={volver} />
        </div>

        <div className="space-y-4">
          <Tarjeta titulo="Datos">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "proveedores", _id: id, _volver: volver }} />
              <fieldset disabled={!editar} className="space-y-3">
                <Campo t="Empresa"><input name="empresa" required defaultValue={p.empresa} className={campo} /></Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo t="Categoría"><Sel name="categoria_id" valor={p.categoria_id} ops={cats ?? []} vacio="—" /></Campo>
                  <Campo t="Tipo"><Sel name="tipo" valor={p.tipo} ops={[{ id: "propio", nombre: "Propio" }, { id: "groove", nombre: "Groove" }]} /></Campo>
                  <Campo t="Contacto"><input name="contacto" defaultValue={p.contacto ?? ""} className={campo} /></Campo>
                  <Campo t="Teléfono"><input name="telefono" defaultValue={p.telefono ?? ""} className={campo} /></Campo>
                  <Campo t="Email"><input name="email" defaultValue={p.email ?? ""} className={campo} /></Campo>
                  <Campo t="Web"><input name="web" defaultValue={p.web ?? ""} className={campo} /></Campo>
                  <Campo t="Valoración (1-5)"><input name="valoracion" type="number" min="1" max="5" defaultValue={p.valoracion ?? ""} className={campo} /></Campo>
                </div>
                <Campo t="Servicios"><textarea name="servicios" rows={2} defaultValue={p.servicios ?? ""} className={campo} /></Campo>
                <Campo t="Notas"><textarea name="notas" rows={2} defaultValue={p.notas ?? ""} className={campo} /></Campo>
                {editar && <button className={`${boton} w-full`}>Guardar</button>}
              </fieldset>
            </form>
          </Tarjeta>
          {importes && (
            <Tarjeta titulo="Condiciones y tarifas generales">
              <form action={guardar} className="space-y-2">
                <Ocultos v={{ _tabla: "proveedor_condiciones", _volver: volver, proveedor_id: id }} />
                <textarea name="condiciones" rows={4} disabled={!editar} defaultValue={(cond as { condiciones: string | null } | null)?.condiciones ?? ""} placeholder="Forma de pago, mínimos, descuentos acordados…" className={campo} />
                {editar && <button className={`${boton} w-full`}>Guardar condiciones</button>}
              </form>
              <p className="mt-2 text-[11px] text-espresso/50">Solo visible para perfiles con acceso a importes.</p>
            </Tarjeta>
          )}
          <DocumentosDe tipo="proveedor" id={id} volver={volver} carpeta="proveedores" />
        </div>
      </div>
    </div>
  );
}
