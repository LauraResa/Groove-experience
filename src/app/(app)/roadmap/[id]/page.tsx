import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrar } from "@/lib/crud";
import { EST_TAREA } from "@/lib/estados";
import { fFechaHora } from "@/lib/fechas";
import { cambiosPorItem, quien, type ItemRoadmap, type LogRoadmap } from "@/lib/roadmap";
import { Aviso, Cabecera, Insignia, Ocultos, Tarjeta, Vacio } from "@/components/ui";
import { Comentarios } from "@/components/Comentarios";
import { FormRoadmap } from "../Formulario";

export default async function AccionRoadmap({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "roadmap")) notFound();
  const editar = puede(s, "roadmap", "editar");
  const supabase = await createClient();
  const volver = `/roadmap/${id}`;

  const [{ data: i }, { data: items }, { data: perfiles }, { data: logs }] = await Promise.all([
    supabase.from("roadmap_items").select("*").eq("id", id).maybeSingle(),
    supabase.from("roadmap_items").select("id, titulo").order("titulo"),
    supabase.from("perfiles").select("id, nombre").not("rol_id", "is", null).order("nombre"),
    supabase.from("actividad_log").select("entidad_id, creado_en, usuario_id, cambios").eq("entidad_tipo", "roadmap").eq("entidad_id", id).eq("accion", "update"),
  ]);
  if (!i) notFound();
  const item = i as ItemRoadmap;
  const nombre = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));
  const cambios = cambiosPorItem((logs ?? []) as LogRoadmap[], nombre).get(id) ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <Cabecera volver={{ href: "/roadmap?vista=historico", txt: "Roadmap" }} ante={item.area ?? "Roadmap"} titulo={item.titulo} sub={quien(item, nombre) || undefined}>
        <Insignia>{EST_TAREA[item.estado]}</Insignia>
      </Cabecera>
      <Aviso error={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Tarjeta titulo="Datos de la acción">
          {editar ? <FormRoadmap i={item} perfiles={perfiles ?? []} items={(items ?? []).map((x) => ({ id: x.id, nombre: x.titulo }))} volver={volver} /> : (
            <div className="space-y-2 text-sm">
              {item.comentarios && <p className="whitespace-pre-line">{item.comentarios}</p>}
              {item.objetivo && <p className="text-espresso/65">Objetivo: {item.objetivo}</p>}
              {item.resultado_esperado && <p className="italic text-espresso/65">→ {item.resultado_esperado}</p>}
            </div>
          )}
          {editar && puede(s, "roadmap", "borrar") && (
            <form action={borrar} data-confirmar className="mt-4 text-right">
              <Ocultos v={{ _tabla: "roadmap_items", _id: id, _ir: "/roadmap?vista=historico" }} />
              <button className="text-xs text-espresso/40 hover:text-red-800">Quitar esta acción</button>
            </form>
          )}
        </Tarjeta>

        <div className="space-y-6">
          <Comentarios tipo="roadmap" id={id} volver={volver} titulo="Notas posteriores" escribir={editar} />
          <Tarjeta titulo="Historial de cambios">
            {cambios.length ? (
              <ul className="space-y-2 text-sm">
                {cambios.map((c, n) => (
                  <li key={n} className="rounded-xl border border-stone/50 bg-cream/70 px-3 py-2">
                    <p className="text-[11px] text-espresso/50">{c.quien} · {fFechaHora(c.fecha)}</p>
                    {c.textos.map((t) => <p key={t}>{t}</p>)}
                  </li>
                ))}
              </ul>
            ) : <Vacio>Sin cambios de estado, fecha o responsables.</Vacio>}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
