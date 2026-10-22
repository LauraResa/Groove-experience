import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { borrarFila, guardarFila } from "./actions";

const campo = "w-full rounded-lg border border-stone bg-cream/80 px-2.5 py-1.5 text-sm outline-none focus:border-olive";
const boton = "rounded-lg bg-olive px-3 py-1.5 text-xs text-cream hover:bg-olive-deep";

const REGLAS = [
  { regla: "descuento_max_pct", nombre: "Descuento máximo", unidad: "%", ayuda: "Por encima, la propuesta pide aprobación a Groove." },
  { regla: "margen_min_pct", nombre: "Margen mínimo", unidad: "%", ayuda: "Por debajo, pide aprobación." },
  { regla: "precio_min_pax", nombre: "Precio mínimo por persona", unidad: "€", ayuda: "Por debajo, pide aprobación." },
  { regla: "importe_max_sin_aprobar", nombre: "Importe máximo sin aprobación", unidad: "€", ayuda: "Por encima, pide aprobación." },
];

export default async function Configuracion({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "configuracion")) notFound();
  const editar = puede(s, "configuracion", "editar");
  const { error, ok } = await searchParams;
  const supabase = await createClient();

  const [{ data: condiciones }, { data: estados }, { data: categorias }, { data: espacios }, { data: catProv }, { data: campanas }] = await Promise.all([
    supabase.from("condiciones_estandar").select("id, regla, valor, activa"),
    supabase.from("estados_lead").select("id, nombre, orden, color, es_ganado, es_perdido").order("orden"),
    supabase.from("categorias").select("id, nombre, padre_id, orden, activa").order("orden"),
    supabase.from("espacios").select("id, nombre, aforo, notas").order("nombre"),
    supabase.from("categorias_proveedor").select("id, nombre, orden").order("orden"),
    supabase.from("campanas").select("id, nombre, fecha_ini, fecha_fin, objetivo, activa").order("fecha_ini", { ascending: false }),
  ]);

  const raices = (categorias ?? []).filter((c) => !c.padre_id);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="aparecer">
        <p className="antetitulo">Ajustes</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Configuración</h1>
      </header>

      {error && <p className="tarjeta border-bronze/60 px-4 py-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="tarjeta px-4 py-3 text-sm text-olive">Guardado.</p>}

      <fieldset disabled={!editar} className="space-y-6">
        <Seccion id="condiciones_estandar" titulo="Condiciones estándar" texto="Si una propuesta se sale de estos límites, se genera una solicitud de aprobación para Groove. Deja vacío o desactiva lo que no quieras controlar.">
          {REGLAS.map((r) => {
            const c = (condiciones ?? []).find((x) => x.regla === r.regla);
            return (
              <form key={r.regla} action={guardarFila} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_9rem_auto_auto] items-center gap-3 py-3 border-t border-stone/40 first:border-t-0">
                <input type="hidden" name="_tabla" value="condiciones_estandar" />
                <input type="hidden" name="_id" value={c?.id ?? ""} />
                <input type="hidden" name="regla" value={r.regla} />
                <div><p className="text-sm font-medium">{r.nombre}</p><p className="text-xs text-espresso/55">{r.ayuda}</p></div>
                <div className="flex items-center gap-1.5">
                  <input name="valor" type="number" step="0.01" min="0" required defaultValue={c?.valor ?? ""} className={campo} />
                  <span className="text-sm text-espresso/60">{r.unidad}</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="activa" defaultChecked={c?.activa ?? true} className="accent-olive" />Activa</label>
                <button className={boton}>Guardar</button>
              </form>
            );
          })}
        </Seccion>

        <Seccion id="estados_lead" titulo="Estados del pipeline" texto="Columnas del kanban de leads. «Ganado» y «Perdido» alimentan los indicadores.">
          {[...(estados ?? []), null].map((e) => (
            <form key={e?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-2 md:grid-cols-[4rem_1fr_6rem_auto_auto_auto_auto] items-center gap-2 py-2 border-t border-stone/40 first:border-t-0">
              <input type="hidden" name="_tabla" value="estados_lead" />
              <input type="hidden" name="_id" value={e?.id ?? ""} />
              <input name="orden" type="number" required defaultValue={e?.orden ?? (estados?.length ?? 0) + 1} className={campo} />
              <input name="nombre" required defaultValue={e?.nombre ?? ""} placeholder="Nuevo estado" className={campo} />
              <input name="color" type="color" defaultValue={e?.color ?? "#c9bba6"} className="h-8 w-full rounded border border-stone bg-cream" />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="es_ganado" defaultChecked={e?.es_ganado} className="accent-olive" />Ganado</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="es_perdido" defaultChecked={e?.es_perdido} className="accent-olive" />Perdido</label>
              <button className={boton}>{e ? "Guardar" : "Añadir"}</button>
              {e ? <Borrar tabla="estados_lead" id={e.id} /> : <span />}
            </form>
          ))}
        </Seccion>

        <Seccion id="categorias" titulo="Categorías de evento" texto="Categorías principales y sus subcategorías. Groove Garden no es una categoría: es un espacio.">
          {raices.map((r) => (
            <div key={r.id} className="py-3 border-t border-stone/40 first:border-t-0 space-y-2">
              <FilaCategoria c={r} />
              <div className="pl-4 md:pl-8 space-y-1.5 border-l border-stone/60">
                {(categorias ?? []).filter((c) => c.padre_id === r.id).map((c) => <FilaCategoria key={c.id} c={c} />)}
                <FilaCategoria c={null} padre={r.id} />
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-stone/40"><FilaCategoria c={null} /></div>
        </Seccion>

        <Seccion id="espacios" titulo="Espacios" texto="Espacios reservables y su aforo.">
          {[...(espacios ?? []), null].map((e) => (
            <form key={e?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-2 md:grid-cols-[1fr_7rem_1.5fr_auto_auto] items-center gap-2 py-2 border-t border-stone/40 first:border-t-0">
              <input type="hidden" name="_tabla" value="espacios" />
              <input type="hidden" name="_id" value={e?.id ?? ""} />
              <input name="nombre" required defaultValue={e?.nombre ?? ""} placeholder="Nuevo espacio" className={campo} />
              <input name="aforo" type="number" min="0" defaultValue={e?.aforo ?? ""} placeholder="Aforo" className={campo} />
              <input name="notas" defaultValue={e?.notas ?? ""} placeholder="Notas" className={campo} />
              <button className={boton}>{e ? "Guardar" : "Añadir"}</button>
              {e ? <Borrar tabla="espacios" id={e.id} /> : <span />}
            </form>
          ))}
        </Seccion>

        <Seccion id="categorias_proveedor" titulo="Categorías de proveedor">
          <div className="grid md:grid-cols-2 gap-x-6">
            {[...(catProv ?? []), null].map((c) => (
              <form key={c?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-[4rem_1fr_auto_auto] items-center gap-2 py-1.5">
                <input type="hidden" name="_tabla" value="categorias_proveedor" />
                <input type="hidden" name="_id" value={c?.id ?? ""} />
                <input name="orden" type="number" defaultValue={c?.orden ?? (catProv?.length ?? 0) + 1} className={campo} />
                <input name="nombre" required defaultValue={c?.nombre ?? ""} placeholder="Nueva categoría" className={campo} />
                <button className={boton}>{c ? "✓" : "Añadir"}</button>
                {c ? <Borrar tabla="categorias_proveedor" id={c.id} /> : <span />}
              </form>
            ))}
          </div>
        </Seccion>

        <Seccion id="campanas" titulo="Campañas" texto="Agrupan leads de una acción comercial (p. ej. Navidad Corporativa).">
          {[...(campanas ?? []), null].map((c) => (
            <form key={c?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-2 md:grid-cols-[1.3fr_9rem_9rem_1.5fr_auto_auto_auto] items-center gap-2 py-2 border-t border-stone/40 first:border-t-0">
              <input type="hidden" name="_tabla" value="campanas" />
              <input type="hidden" name="_id" value={c?.id ?? ""} />
              <input name="nombre" required defaultValue={c?.nombre ?? ""} placeholder="Nueva campaña" className={campo} />
              <input name="fecha_ini" type="date" defaultValue={c?.fecha_ini ?? ""} className={campo} />
              <input name="fecha_fin" type="date" defaultValue={c?.fecha_fin ?? ""} className={campo} />
              <input name="objetivo" defaultValue={c?.objetivo ?? ""} placeholder="Objetivo" className={campo} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="activa" defaultChecked={c?.activa ?? true} className="accent-olive" />Activa</label>
              <button className={boton}>{c ? "Guardar" : "Añadir"}</button>
              {c ? <Borrar tabla="campanas" id={c.id} /> : <span />}
            </form>
          ))}
        </Seccion>
      </fieldset>
    </div>
  );
}

function Seccion({ id, titulo, texto, children }: { id: string; titulo: string; texto?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="tarjeta aparecer p-5 md:p-6 scroll-mt-6">
      <h2 className="font-serif text-xl">{titulo}</h2>
      {texto && <p className="text-xs text-espresso/55 mt-1 mb-3">{texto}</p>}
      <div className={texto ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Borrar({ tabla, id }: { tabla: string; id: string }) {
  return (
    <button formAction={borrarFila} name="_borrar" value="1" formNoValidate
      className="rounded-lg border border-stone px-2.5 py-1.5 text-xs text-espresso/60 hover:border-red-800 hover:text-red-800" title="Borrar"
      data-tabla={tabla} data-id={id}>
      Borrar
    </button>
  );
}

type Cat = { id: string; nombre: string; padre_id: string | null; orden: number; activa: boolean };

function FilaCategoria({ c, padre }: { c: Cat | null; padre?: string }) {
  return (
    <form action={guardarFila} className="grid grid-cols-[3.5rem_1fr_auto_auto_auto] items-center gap-2">
      <input type="hidden" name="_tabla" value="categorias" />
      <input type="hidden" name="_id" value={c?.id ?? ""} />
      <input type="hidden" name="padre_id" value={c?.padre_id ?? padre ?? ""} />
      <input name="orden" type="number" defaultValue={c?.orden ?? 99} className={campo} />
      <input name="nombre" required defaultValue={c?.nombre ?? ""} placeholder={padre ? "Nueva subcategoría" : "Nueva categoría principal"}
        className={`${campo} ${c && !c.padre_id ? "font-serif text-base font-medium" : ""}`} />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="activa" defaultChecked={c?.activa ?? true} className="accent-olive" />Activa</label>
      <button className={boton}>{c ? "✓" : "Añadir"}</button>
      {c ? <Borrar tabla="categorias" id={c.id} /> : <span />}
    </form>
  );
}
