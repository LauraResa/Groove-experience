import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar } from "@/lib/crud";
import { fFecha } from "@/lib/fechas";
import { CARPETAS } from "@/lib/estados";
import { Cabecera, Campo, Filtros, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";
import { vincularDocumento } from "./actions";

const RUTA: Record<string, string> = { lead: "/leads/", evento: "/eventos/", propuesta: "/propuestas/", cliente: "/clientes/", proveedor: "/proveedores/", formato: "/formatos/" };

export default async function Documentos({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "documentos")) notFound();
  const { f = "", q = "" } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase.from("documentos").select("id, nombre, carpeta, url_externa, subido_en, perfiles(nombre), documento_vinculos(entidad_tipo, entidad_id)").order("subido_en", { ascending: false });
  if (f) consulta = consulta.eq("carpeta", f);
  if (q) consulta = consulta.ilike("nombre", `%${q}%`);
  const { data: docs } = await consulta;

  return (
    <div className="space-y-6 max-w-6xl">
      <Cabecera ante="Recursos" titulo="Documentos" sub="Enlaces a dossiers, tarifas, contratos y materiales, vinculados a clientes, eventos, propuestas o formatos.">
        {puede(s, "documentos", "crear") && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Añadir documento</>} titulo="Añadir documento">
            <form action={vincularDocumento} className="space-y-3">
              <Ocultos v={{ _volver: "/documentos" }} />
              <Campo t="Nombre"><input name="nombre" required className={campo} /></Campo>
              <Campo t="Carpeta"><Sel name="carpeta" ops={Object.entries(CARPETAS).map(([id, nombre]) => ({ id, nombre }))} /></Campo>
              <Campo t="Enlace (Drive, Dropbox, Canva…)"><input name="url_externa" type="url" required className={campo} /></Campo>
              <p className="text-xs text-espresso/55">Para vincularlo a un cliente, evento o formato, añádelo desde su ficha.</p>
              <button className={`${boton} w-full`}>Guardar</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      <div className="flex flex-wrap items-center gap-3">
        <Filtros base={q ? `/documentos?q=${encodeURIComponent(q)}` : "/documentos"} actual={f} ops={[{ v: "", t: "Todas" }, ...Object.entries(CARPETAS).map(([v, t]) => ({ v, t }))]} />
        <form className="ml-auto"><input name="q" defaultValue={q} placeholder="Buscar…" className={`${campo} w-48`} />{f && <input type="hidden" name="f" value={f} />}</form>
      </div>

      <Tarjeta sinPadding>
        {docs?.length ? (
          <ul className="divide-y divide-stone/40">
            {docs.map((d) => {
              const v = (d.documento_vinculos ?? []) as { entidad_tipo: string; entidad_id: string }[];
              return (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Icono n="documentos" className="h-5 w-5 shrink-0 text-bronze" />
                  <div className="min-w-0 flex-1">
                    <a href={d.url_externa ?? "#"} target="_blank" rel="noreferrer" className="font-medium hover:text-olive">{d.nombre}</a>
                    <p className="text-xs text-espresso/55">{CARPETAS[d.carpeta]} · {fFecha(d.subido_en)} · {(d.perfiles as unknown as { nombre: string } | null)?.nombre}
                      {v.map((x) => RUTA[x.entidad_tipo] && <a key={x.entidad_id} href={`${RUTA[x.entidad_tipo]}${x.entidad_id}`} className="ml-2 text-olive hover:text-bronze">{x.entidad_tipo} →</a>)}</p>
                  </div>
                  {puede(s, "documentos", "borrar") && <form action={borrar}><Ocultos v={{ _tabla: "documentos", _id: d.id, _volver: "/documentos" }} /><button className="text-xs text-espresso/40 hover:text-red-800" title="Quitar">×</button></form>}
                </li>
              );
            })}
          </ul>
        ) : <Vacio>No hay documentos{f ? " en esta carpeta" : ""}.</Vacio>}
      </Tarjeta>
    </div>
  );
}
