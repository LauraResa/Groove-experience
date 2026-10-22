import { createClient } from "@/lib/supabase/server";
import { alternarEspacio } from "@/app/(app)/propuestas/actions";

/** Chips de espacios (Sala principal, Groove Garden…) activables */
export async function Espacios({ tabla, col, id, volver, editar }: { tabla: string; col: string; id: string; volver: string; editar: boolean }) {
  const supabase = await createClient();
  const [{ data: espacios }, { data: sel }] = await Promise.all([
    supabase.from("espacios").select("id, nombre, aforo").order("nombre"),
    supabase.from(tabla).select("espacio_id").eq(col, id),
  ]);
  const activos = new Set((sel ?? []).map((e) => e.espacio_id));
  return (
    <div className="flex flex-wrap gap-1.5">
      {(espacios ?? []).map((e) => {
        const on = activos.has(e.id);
        return (
          <form key={e.id} action={alternarEspacio}>
            <input type="hidden" name="tabla" value={tabla} /><input type="hidden" name="id" value={id} />
            <input type="hidden" name="espacio_id" value={e.id} /><input type="hidden" name="on" value={on ? "1" : "0"} />
            <input type="hidden" name="_volver" value={volver} />
            <button disabled={!editar} className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-olive bg-olive text-cream" : "border-stone text-espresso/55 hover:border-olive"}`}>
              {e.nombre}{e.aforo ? ` · ${e.aforo}` : ""}
            </button>
          </form>
        );
      })}
    </div>
  );
}
