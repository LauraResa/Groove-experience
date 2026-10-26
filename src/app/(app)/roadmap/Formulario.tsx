import { guardar } from "@/lib/crud";
import { EST_TAREA, PRIORIDADES } from "@/lib/estados";
import type { ItemRoadmap } from "@/lib/roadmap";
import { Campo, Ocultos, Sel, boton, campo } from "@/components/ui";

type P = { id: string; nombre: string };

/** Alta y edición de una acción del roadmap (mismo formulario) */
export function FormRoadmap({ i, perfiles, items, volver }: { i?: ItemRoadmap; perfiles: P[]; items: P[]; volver: string }) {
  const part = new Set(i?.participantes ?? []);
  return (
    <form action={guardar} className="space-y-3">
      <Ocultos v={{ _tabla: "roadmap_items", _id: i?.id, _volver: volver, _a: "participantes" }} />
      <Campo t="Título"><input name="titulo" required defaultValue={i?.titulo} className={campo} /></Campo>
      <Campo t="Descripción"><textarea name="comentarios" rows={3} defaultValue={i?.comentarios ?? ""} className={campo} /></Campo>
      <Campo t="Objetivo"><input name="objetivo" defaultValue={i?.objetivo ?? ""} className={campo} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo t="Estado"><Sel name="estado" valor={i?.estado ?? "pendiente"} ops={Object.entries(EST_TAREA).map(([id, nombre]) => ({ id, nombre }))} /></Campo>
        <Campo t="Prioridad"><Sel name="prioridad" valor={i?.prioridad ?? "media"} ops={PRIORIDADES} /></Campo>
        <Campo t="Inicio"><input name="fecha_inicio" type="date" defaultValue={i?.fecha_inicio ?? ""} className={campo} /></Campo>
        <Campo t="Fecha límite / realizado"><input name="fecha_limite" type="date" defaultValue={i?.fecha_limite ?? ""} className={campo} /></Campo>
        <Campo t="Responsable"><Sel name="responsable_id" valor={i?.responsable_id} ops={perfiles} vacio="—" /></Campo>
        <Campo t="Corresponsable"><Sel name="corresponsable_id" valor={i?.corresponsable_id} ops={perfiles} vacio="—" /></Campo>
        <Campo t="Colaborador"><Sel name="colaborador_id" valor={i?.colaborador_id} ops={perfiles} vacio="—" /></Campo>
        <Campo t="Semana (1-12)"><input name="semana" type="number" min="1" max="12" defaultValue={i?.semana ?? ""} className={campo} /></Campo>
        <Campo t="Área"><input name="area" list="areas" defaultValue={i?.area ?? ""} className={campo} placeholder="Comercial, Operativa…" /></Campo>
        <Campo t="Depende de"><Sel name="depende_de_id" valor={i?.depende_de_id} ops={items.filter((x) => x.id !== i?.id)} vacio="—" /></Campo>
      </div>
      <Campo t="Participantes">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-stone bg-cream/80 px-3 py-2">
          {perfiles.map((p) => (
            <label key={p.id} className="inline-flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="participantes" value={p.id} defaultChecked={part.has(p.id)} className="accent-olive" />{p.nombre}
            </label>
          ))}
        </div>
      </Campo>
      <Campo t="Resultado esperado"><input name="resultado_esperado" defaultValue={i?.resultado_esperado ?? ""} className={campo} /></Campo>
      <datalist id="areas">{["Comercial", "Operativa", "Comunicación", "Producto", "Alianzas", "Finanzas", "Hito"].map((a) => <option key={a} value={a} />)}</datalist>
      <button className={`${boton} w-full`}>{i ? "Guardar cambios" : "Añadir"}</button>
    </form>
  );
}
