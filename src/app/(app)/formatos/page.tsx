import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { eur } from "@/lib/fechas";
import { Cabecera, Campo, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

export default async function Formatos() {
  const s = await getSesion();
  if (!puede(s, "formatos")) notFound();
  const importes = puede(s, "formatos", "ver_importes");
  const supabase = await createClient();
  const [{ data: formatos }, { data: categorias }] = await Promise.all([
    supabase.from("formatos").select("id, nombre, padre_id, descripcion, publico, aforo, coste_estimado, ingreso_potencial, categorias(nombre), eventos(id)").order("nombre"),
    supabase.from("categorias").select("id, nombre").not("padre_id", "is", null).order("orden"),
  ]);
  const raices = (formatos ?? []).filter((f) => !f.padre_id);
  const hijos = (id: string) => (formatos ?? []).filter((f) => f.padre_id === id);

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera ante="Desarrollo" titulo="Formatos propios" sub="Conceptos creados por THE GROOVE EXPERIENCE. Cada edición es un evento vinculado al formato.">
        {puede(s, "formatos", "crear") && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Nuevo formato</>} titulo="Nuevo formato">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "formatos", _volver: "/formatos", _ir: "/formatos/" }} />
              <Campo t="Nombre"><input name="nombre" required className={campo} /></Campo>
              <Campo t="Es variante / edición temática de"><Sel name="padre_id" ops={raices.map((f) => ({ id: f.id, nombre: f.nombre }))} vacio="— Formato independiente —" /></Campo>
              <Campo t="Categoría"><Sel name="categoria_id" ops={categorias ?? []} vacio="—" /></Campo>
              <Campo t="Descripción"><textarea name="descripcion" rows={3} className={campo} /></Campo>
              <button className={`${boton} w-full`}>Crear formato</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      {raices.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {raices.map((f) => (
            <section key={f.id} className="tarjeta aparecer overflow-hidden">
              <Link href={`/formatos/${f.id}`} className="block p-5 hover:bg-cream/40">
                <p className="antetitulo">{(f.categorias as unknown as { nombre: string } | null)?.nombre ?? "Formato propio"}</p>
                <h2 className="mt-1 font-serif text-2xl">{f.nombre}</h2>
                {f.descripcion && <p className="mt-2 line-clamp-3 text-sm text-espresso/70">{f.descripcion}</p>}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-espresso/60">
                  <span>{(f.eventos ?? []).length} ediciones</span>
                  {f.aforo && <span>Aforo {f.aforo}</span>}
                  {importes && f.ingreso_potencial && <span>Ingreso potencial {eur(f.ingreso_potencial)}</span>}
                </div>
              </Link>
              {hijos(f.id).length > 0 && (
                <div className="border-t border-stone/50 bg-cream/30 px-5 py-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-espresso/50">Variantes</p>
                  <div className="flex flex-wrap gap-2">
                    {hijos(f.id).map((h) => <Link key={h.id} href={`/formatos/${h.id}`} className="rounded-full border border-stone bg-cream px-3 py-1 text-sm hover:border-olive">{h.nombre}</Link>)}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : <Tarjeta><Vacio>Todavía no hay formatos.</Vacio></Tarjeta>}
    </div>
  );
}
