import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { guardar } from "@/lib/crud";
import { fFecha } from "@/lib/fechas";
import { Ocultos, Tarjeta, Vacio, botonMini, campo } from "./ui";

/** Tareas vinculadas a una entidad, con alta rápida */
export async function TareasDe({ tipo, id, volver, editar }: { tipo: string; id: string; volver: string; editar: boolean }) {
  const supabase = await createClient();
  const [{ data }, { data: perfiles }] = await Promise.all([
    supabase.from("tareas").select("id, titulo, fecha, estado, prioridad, perfiles!tareas_responsable_id_fkey(nombre)").eq("entidad_tipo", tipo).eq("entidad_id", id).order("fecha", { nullsFirst: false }),
    supabase.from("perfiles").select("id, nombre").not("rol_id", "is", null),
  ]);
  return (
    <Tarjeta titulo="Tareas" accion={<Link href="/tareas" className="text-xs text-olive hover:text-bronze">Todas →</Link>}>
      {data?.length ? (
        <ul className="mb-4 divide-y divide-stone/40">
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
              <form action={guardar}>
                <Ocultos v={{ _tabla: "tareas", _id: t.id, _volver: volver, estado: t.estado === "finalizado" ? "pendiente" : "finalizado" }} />
                <button className={`grid h-5 w-5 place-items-center rounded border text-[11px] ${t.estado === "finalizado" ? "border-olive bg-olive text-cream" : "border-stone"}`}>{t.estado === "finalizado" ? "✓" : ""}</button>
              </form>
              <span className={`flex-1 ${t.estado === "finalizado" ? "line-through text-espresso/45" : ""}`}>{t.titulo}</span>
              <span className="text-xs text-espresso/55">{(t.perfiles as unknown as { nombre: string } | null)?.nombre}</span>
              {t.fecha && <span className="text-xs text-espresso/55">{fFecha(t.fecha, { day: "numeric", month: "short" })}</span>}
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin tareas.</Vacio>}
      {editar && (
        <form action={guardar} className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_9rem_8rem_auto]">
          <Ocultos v={{ _tabla: "tareas", _volver: volver, entidad_tipo: tipo, entidad_id: id }} />
          <input name="titulo" required placeholder="Nueva tarea" className={`${campo} col-span-2 md:col-span-1`} />
          <select name="responsable_id" className={campo} defaultValue="">
            <option value="">Responsable</option>
            {(perfiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input name="fecha" type="date" className={campo} />
          <button className={botonMini}>Añadir</button>
        </form>
      )}
    </Tarjeta>
  );
}
