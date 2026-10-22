import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { fFecha, hoyMadrid } from "@/lib/fechas";
import { EST_TAREA, PRIORIDADES } from "@/lib/estados";
import { Cabecera, Campo, Filtros, Insignia, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Cajon } from "@/components/Cajon";
import { Icono } from "../Icono";

const RUTA: Record<string, string> = { lead: "/leads/", evento: "/eventos/", propuesta: "/propuestas/", cliente: "/clientes/", proveedor: "/proveedores/", formato: "/formatos/", roadmap: "/roadmap" };
const ENT: Record<string, string> = { lead: "Lead", evento: "Evento", propuesta: "Propuesta", cliente: "Cliente", proveedor: "Proveedor", formato: "Formato", roadmap: "Roadmap" };

export default async function Tareas({ searchParams }: { searchParams: Promise<{ f?: string; quien?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "tareas")) notFound();
  const { f = "abiertas", quien = "mias" } = await searchParams;
  const hoy = hoyMadrid();
  const supabase = await createClient();

  let q = supabase.from("tareas").select("id, titulo, fecha, prioridad, estado, notas, entidad_tipo, entidad_id, responsable_id, perfiles!tareas_responsable_id_fkey(nombre)").order("fecha", { nullsFirst: false });
  if (quien === "mias") q = q.eq("responsable_id", s.id);
  if (f === "abiertas") q = q.neq("estado", "finalizado");
  if (f === "hechas") q = q.eq("estado", "finalizado");
  const [{ data: tareas }, { data: perfiles }] = await Promise.all([q, supabase.from("perfiles").select("id, nombre").not("rol_id", "is", null)]);

  const grupos = [
    { t: "Vencidas", ts: (tareas ?? []).filter((t) => t.estado !== "finalizado" && t.fecha && t.fecha < hoy), aviso: true },
    { t: "Hoy", ts: (tareas ?? []).filter((t) => t.estado !== "finalizado" && t.fecha === hoy) },
    { t: "Próximas", ts: (tareas ?? []).filter((t) => t.estado !== "finalizado" && t.fecha && t.fecha > hoy) },
    { t: "Sin fecha", ts: (tareas ?? []).filter((t) => t.estado !== "finalizado" && !t.fecha) },
    { t: "Finalizadas", ts: (tareas ?? []).filter((t) => t.estado === "finalizado") },
  ].filter((g) => g.ts.length);
  const base = `/tareas?quien=${quien}`;

  return (
    <div className="space-y-6 max-w-5xl">
      <Cabecera ante="Mi día" titulo="Tareas" sub="Tareas sueltas y de leads, eventos, propuestas, clientes, proveedores y formatos.">
        {puede(s, "tareas", "crear") && (
          <Cajon boton={<><Icono n="mas" className="h-4 w-4" />Nueva tarea</>} titulo="Nueva tarea">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "tareas", _volver: "/tareas" }} />
              <Campo t="Título"><input name="titulo" required className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo t="Responsable"><Sel name="responsable_id" valor={s.id} ops={perfiles ?? []} vacio="—" /></Campo>
                <Campo t="Fecha"><input name="fecha" type="date" className={campo} /></Campo>
                <Campo t="Prioridad"><Sel name="prioridad" valor="media" ops={PRIORIDADES} /></Campo>
              </div>
              <Campo t="Notas"><textarea name="notas" rows={3} className={campo} /></Campo>
              <button className={`${boton} w-full`}>Crear tarea</button>
            </form>
          </Cajon>
        )}
      </Cabecera>

      <div className="flex flex-wrap gap-3">
        <Filtros base={`/tareas?f=${f}`} actual={quien} param="quien" ops={[{ v: "mias", t: "Mías" }, { v: "equipo", t: "Equipo" }]} />
        <Filtros base={base} actual={f} ops={[{ v: "abiertas", t: "Abiertas" }, { v: "hechas", t: "Finalizadas" }, { v: "todas", t: "Todas" }]} />
      </div>

      {grupos.length ? grupos.map((g) => (
        <Tarjeta key={g.t} titulo={<span className={g.aviso ? "text-bronze" : ""}>{g.t} <span className="text-sm text-espresso/45">{g.ts.length}</span></span>} sinPadding>
          <ul className="divide-y divide-stone/40">
            {g.ts.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <form action={guardar}>
                  <Ocultos v={{ _tabla: "tareas", _id: t.id, _volver: "/tareas", estado: t.estado === "finalizado" ? "pendiente" : "finalizado" }} />
                  <button className={`grid h-5 w-5 place-items-center rounded border text-[11px] ${t.estado === "finalizado" ? "border-olive bg-olive text-cream" : "border-stone hover:border-olive"}`}>{t.estado === "finalizado" ? "✓" : ""}</button>
                </form>
                <div className="min-w-0 flex-1">
                  <p className={t.estado === "finalizado" ? "text-espresso/45 line-through" : ""}>{t.titulo}</p>
                  {t.entidad_tipo && <Link href={`${RUTA[t.entidad_tipo] ?? "/"}${t.entidad_tipo === "roadmap" ? "" : t.entidad_id}`} className="text-[11px] text-olive hover:text-bronze">{ENT[t.entidad_tipo] ?? t.entidad_tipo} →</Link>}
                </div>
                {t.prioridad !== "media" && <Insignia tono={t.prioridad === "urgente" || t.prioridad === "alta" ? "bronze" : "apagado"}>{t.prioridad}</Insignia>}
                {t.estado !== "pendiente" && t.estado !== "finalizado" && <Insignia tono="olive">{EST_TAREA[t.estado]}</Insignia>}
                <span className="w-24 text-right text-xs text-espresso/55">{(t.perfiles as unknown as { nombre: string } | null)?.nombre}</span>
                <span className="w-16 text-right text-xs text-espresso/55">{t.fecha ? fFecha(t.fecha, { day: "numeric", month: "short" }) : ""}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )) : <Tarjeta><Vacio>{quien === "mias" ? "No tienes tareas en este filtro." : "No hay tareas."}</Vacio></Tarjeta>}
    </div>
  );
}
