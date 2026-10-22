import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { fFecha, hoyMadrid } from "@/lib/fechas";
import { Cabecera, Filtros, Insignia, Ocultos, Sel, Tarjeta, Vacio, botonMini, campo } from "@/components/ui";

const EST = [{ id: "necesidad", nombre: "Necesidad" }, { id: "en_produccion", nombre: "En producción" }, { id: "producido", nombre: "Producido" }, { id: "publicado", nombre: "Publicado" }];

export default async function Contenidos({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "contenidos")) notFound();
  const { f = "pendientes" } = await searchParams;
  const editar = puede(s, "contenidos", "editar");
  const hoy = hoyMadrid();
  const supabase = await createClient();
  const { data } = await supabase.from("contenidos").select("id, tipo, necesidad, estado, enlace, evento_id, formato_id, eventos(id, nombre, fecha), formatos(id, nombre)");
  const todos = (data ?? []).sort((a, b) => ((a.eventos as unknown as { fecha: string } | null)?.fecha ?? "9").localeCompare((b.eventos as unknown as { fecha: string } | null)?.fecha ?? "9"));
  const lista = todos.filter((c) => f === "todos" ? true : f === "publicados" ? c.estado === "publicado" : c.estado !== "publicado");

  return (
    <div className="space-y-6 max-w-6xl">
      <Cabecera volver={{ href: "/eventos", txt: "Eventos" }} ante="Comunicación" titulo="Contenidos" sub="Fotos, vídeos, reels, posts y prensa de cada evento o formato. Se añaden desde la ficha del evento." />
      <Filtros base="/contenidos" actual={f} ops={[{ v: "pendientes", t: "Pendientes", n: todos.filter((c) => c.estado !== "publicado").length }, { v: "publicados", t: "Publicados" }, { v: "todos", t: "Todos" }]} />
      <Tarjeta sinPadding>
        {lista.length ? (
          <div className="divide-y divide-stone/40">
            {lista.map((c) => {
              const e = c.eventos as unknown as { id: string; nombre: string; fecha: string } | null;
              const fo = c.formatos as unknown as { id: string; nombre: string } | null;
              const pasado = e && e.fecha < hoy && c.estado === "necesidad";
              return (
                <form key={c.id} action={guardar} className="grid grid-cols-2 items-center gap-2 px-5 py-3 md:grid-cols-[1.2fr_6rem_1fr_9rem_1fr_auto]">
                  <Ocultos v={{ _tabla: "contenidos", _id: c.id, _volver: "/contenidos" }} />
                  <div className="min-w-0">
                    {e ? <Link href={`/eventos/${e.id}`} className="font-medium hover:text-olive">{e.nombre}</Link> : fo ? <Link href={`/formatos/${fo.id}`} className="font-medium hover:text-olive">{fo.nombre}</Link> : "—"}
                    {e && <p className={`text-xs ${pasado ? "text-bronze" : "text-espresso/55"}`}>{fFecha(e.fecha)}{pasado && " · evento pasado"}</p>}
                  </div>
                  <Insignia tono="apagado">{c.tipo}</Insignia>
                  <input name="necesidad" defaultValue={c.necesidad ?? ""} disabled={!editar} className={`${campo} py-1.5`} />
                  <Sel name="estado" valor={c.estado} ops={EST} className={`${campo} py-1.5`} />
                  <input name="enlace" defaultValue={c.enlace ?? ""} placeholder="Enlace" disabled={!editar} className={`${campo} py-1.5`} />
                  {editar && <button className={botonMini}>✓</button>}
                </form>
              );
            })}
          </div>
        ) : <Vacio>No hay contenidos en este filtro.</Vacio>}
      </Tarjeta>
    </div>
  );
}
