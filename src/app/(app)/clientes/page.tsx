import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { eur } from "@/lib/fechas";
import { TIPOS_CLIENTE } from "@/lib/estados";
import { Cabecera, Campo, Filtros, Insignia, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "clientes")) notFound();
  const { f = "", q = "" } = await searchParams;
  const importes = puede(s, "clientes", "ver_importes");
  const supabase = await createClient();

  let consulta = supabase.from("clientes").select("id, nombre, tipo, sector, web, contactos(nombre, email, principal), leads(id), eventos(id, evento_finanzas(facturacion, extras))").order("nombre");
  if (f) consulta = consulta.eq("tipo", f);
  if (q) consulta = consulta.ilike("nombre", `%${q}%`);
  const { data: clientes } = await consulta;

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Comercial" titulo="Clientes" sub="Marcas, empresas, agencias, particulares, partners y comunidades.">
        {puede(s, "clientes", "crear") && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Nuevo cliente</>} titulo="Nuevo cliente">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "clientes", _volver: "/clientes", _ir: "/clientes/" }} />
              <Campo t="Nombre"><input name="nombre" required className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Tipo"><Sel name="tipo" ops={TIPOS_CLIENTE} /></Campo>
                <Campo t="Sector"><input name="sector" className={campo} /></Campo>
                <Campo t="CIF"><input name="cif" className={campo} /></Campo>
                <Campo t="Web"><input name="web" className={campo} /></Campo>
              </div>
              <Campo t="Notas"><textarea name="notas" rows={3} className={campo} /></Campo>
              <button className={`${boton} w-full`}>Crear cliente</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      <div className="flex flex-wrap items-center gap-3">
        <Filtros base={q ? `/clientes?q=${encodeURIComponent(q)}` : "/clientes"} actual={f} ops={[{ v: "", t: "Todos" }, ...TIPOS_CLIENTE.map((t) => ({ v: t, t: t[0].toUpperCase() + t.slice(1) }))]} />
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Buscar cliente…" className={`${campo} w-56`} />{f && <input type="hidden" name="f" value={f} />}</form>
      </div>

      <Tarjeta sinPadding>
        {clientes?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                <th className="px-5 py-3 font-medium">Cliente</th><th className="px-5 py-3 font-medium">Contacto principal</th>
                <th className="px-5 py-3 text-center font-medium">Leads</th><th className="px-5 py-3 text-center font-medium">Eventos</th>
                {importes && <th className="px-5 py-3 text-right font-medium">Facturación</th>}
              </tr></thead>
              <tbody>
                {clientes.map((c) => {
                  const cs = (c.contactos ?? []) as { nombre: string; email: string | null; principal: boolean }[];
                  const cp = cs.find((x) => x.principal) ?? cs[0];
                  const evs = (c.eventos ?? []) as unknown as { evento_finanzas: { facturacion: number; extras: number } | null }[];
                  const fact = evs.reduce((a, e) => a + Number(e.evento_finanzas?.facturacion ?? 0) + Number(e.evento_finanzas?.extras ?? 0), 0);
                  return (
                    <tr key={c.id} className="border-t border-stone/40 hover:bg-cream/50">
                      <td className="px-5 py-3"><Link href={`/clientes/${c.id}`} className="font-medium hover:text-olive">{c.nombre}</Link>
                        <p className="text-xs text-espresso/55"><Insignia tono="apagado">{c.tipo}</Insignia>{c.sector && ` ${c.sector}`}</p></td>
                      <td className="px-5 py-3">{cp ? <><p>{cp.nombre}</p><p className="text-xs text-espresso/55">{cp.email}</p></> : <span className="text-espresso/40">—</span>}</td>
                      <td className="px-5 py-3 text-center">{(c.leads ?? []).length}</td>
                      <td className="px-5 py-3 text-center">{evs.length}</td>
                      {importes && <td className="px-5 py-3 text-right">{fact ? eur(fact) : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Vacio>No hay clientes{q && ` que coincidan con «${q}»`}. Se crean solos al dar de alta un lead.</Vacio>}
      </Tarjeta>
    </div>
  );
}
