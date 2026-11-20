import { type Categoria, type Item, DISPONIBILIDAD, ESTADOS } from "@/lib/inventario";
import { guardarItem } from "@/app/(app)/inventario/actions";
import { campo } from "@/components/ui";

const et = "mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-espresso/55";

function C({ t, children, className = "" }: { t: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className={et}>{t}</span>{children}</label>;
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-stone/60 pt-5">
      <legend className="float-left mb-3 w-full font-serif text-lg">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function FormItem({ item, categorias, ubicaciones, catInicial }: { item?: Item; categorias: Categoria[]; ubicaciones: string[]; catInicial?: string }) {
  const v = (k: keyof Item) => (item?.[k] ?? "") as string | number;
  return (
    <form action={guardarItem} className="space-y-6">
      {item && <input type="hidden" name="_id" value={item.id} />}
      <input type="hidden" name="_conf" value="1" />

      <div className="space-y-3">
        <C t="Nombre *"><input name="nombre" required defaultValue={v("nombre")} className={campo} placeholder="Ej. Sillas Tolix negras" /></C>
        <div className="grid grid-cols-2 gap-3">
          <C t="Categoría">
            <select name="categoria_id" defaultValue={item?.categoria_id ?? catInicial ?? ""} className={campo}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </C>
          <C t="Código"><input name="codigo" defaultValue={v("codigo")} className={campo} placeholder="Opcional" /></C>
        </div>
        <C t="Descripción"><textarea name="descripcion" rows={2} defaultValue={v("descripcion")} className={campo} /></C>
      </div>

      <Bloque titulo="Cantidad">
        <div className="grid grid-cols-2 gap-3">
          <C t="Unidades"><input name="cantidad" type="number" min={0} inputMode="numeric" defaultValue={v("cantidad")} className={campo} /></C>
          <C t="Unidad"><input name="unidad" defaultValue={v("unidad")} className={campo} placeholder="sillas, mesas…" /></C>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone/60 bg-cream/60 p-3 text-sm">
          <input type="checkbox" name="cantidad_confirmada" defaultChecked={item?.cantidad_confirmada ?? false} className="mt-0.5 h-4 w-4 accent-[#6f7458]" />
          <span><b className="font-medium">Cantidad confirmada</b><br /><span className="text-xs text-espresso/55">Solo las cantidades confirmadas suman al stock y al material disponible.</span></span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <C t="Estimación mínima"><input name="cantidad_min" type="number" min={0} defaultValue={v("cantidad_min")} className={campo} /></C>
          <C t="Estimación máxima"><input name="cantidad_max" type="number" min={0} defaultValue={v("cantidad_max")} className={campo} /></C>
        </div>
        <C t="Pendiente de confirmar"><input name="pendiente" defaultValue={v("pendiente")} className={campo} placeholder="Ej. Cantidad exacta, nombre, propiedad… (vacío si nada)" /></C>
      </Bloque>

      <Bloque titulo="Medidas y acabado">
        <div className="grid grid-cols-3 gap-3">
          <C t="Ancho (cm)"><input name="ancho_cm" inputMode="decimal" defaultValue={v("ancho_cm")} className={campo} /></C>
          <C t="Alto (cm)"><input name="alto_cm" inputMode="decimal" defaultValue={v("alto_cm")} className={campo} /></C>
          <C t="Fondo (cm)"><input name="fondo_cm" inputMode="decimal" defaultValue={v("fondo_cm")} className={campo} /></C>
        </div>
        <C t="Nota sobre medidas"><input name="medidas_nota" defaultValue={v("medidas_nota")} className={campo} /></C>
        <div className="grid grid-cols-2 gap-3">
          <C t="Material"><input name="material" defaultValue={v("material")} className={campo} /></C>
          <C t="Color"><input name="color" defaultValue={v("color")} className={campo} /></C>
        </div>
      </Bloque>

      <Bloque titulo="Estado y ubicación">
        <div className="grid grid-cols-2 gap-3">
          <C t="Estado de conservación">
            <select name="estado" defaultValue={item?.estado ?? "por_revisar"} className={campo}>
              {Object.entries(ESTADOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </C>
          <C t="Unidades deterioradas"><input name="unidades_deterioradas" type="number" min={0} defaultValue={item?.unidades_deterioradas ?? 0} className={campo} /></C>
          <C t="Ubicación">
            <input name="ubicacion" list="ubicaciones-inv" defaultValue={v("ubicacion")} className={campo} placeholder="Almacén, carpa…" />
            <datalist id="ubicaciones-inv">{ubicaciones.map((u) => <option key={u} value={u} />)}</datalist>
          </C>
          <C t="Disponibilidad">
            <select name="disponibilidad" defaultValue={item?.disponibilidad ?? ""} className={campo}>
              <option value="">Sin definir</option>
              {Object.entries(DISPONIBILIDAD).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </C>
        </div>
        <C t="Observaciones"><textarea name="observaciones" rows={3} defaultValue={v("observaciones")} className={campo} /></C>
      </Bloque>

      <div className="sticky bottom-0 -mx-6 border-t border-stone/60 bg-cream/95 px-6 py-4 backdrop-blur">
        <button className="w-full rounded-full bg-olive-deep py-3 text-sm text-cream transition hover:bg-espresso">{item ? "Guardar cambios" : "Crear artículo"}</button>
      </div>
    </form>
  );
}
