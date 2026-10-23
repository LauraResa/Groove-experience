import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { MODULOS } from "@/lib/modulos";
import { EST_EVENTO, EST_PROPUESTA } from "@/lib/estados";
import { borrarFila, guardarFila } from "./actions";

const campo = "w-full rounded-lg border border-stone bg-cream/80 px-2.5 py-1.5 text-sm outline-none focus:border-olive";
const boton = "rounded-lg bg-olive px-3 py-1.5 text-xs text-cream hover:bg-olive-deep";

const REGLAS = [
  { regla: "descuento_max_pct", nombre: "Descuento máximo", unidad: "%", ayuda: "Si una propuesta lleva más descuento, necesita aprobación de Groove." },
  { regla: "margen_min_pct", nombre: "Margen mínimo", unidad: "%", ayuda: "Si el margen de una propuesta queda por debajo, necesita aprobación." },
  { regla: "precio_min_pax", nombre: "Precio mínimo por persona", unidad: "€", ayuda: "Si el precio por asistente queda por debajo, necesita aprobación." },
  { regla: "importe_max_sin_aprobar", nombre: "Importe máximo sin aprobación", unidad: "€", ayuda: "Si el total supera esta cifra, necesita aprobación." },
];

const TXT_PROPUESTA: Record<string, string> = {
  borrador: "Se está preparando.",
  pendiente_aprobacion: "Fuera de las reglas comerciales: espera el visto bueno de Groove.",
  aprobada: "Groove ha dado el visto bueno; se puede enviar.",
  enviada: "Enviada al cliente.",
  negociacion: "El cliente está negociando.",
  aceptada: "El cliente ha dicho que sí. Se puede convertir en evento.",
  rechazada: "El cliente ha dicho que no.",
  caducada: "Sustituida por una versión nueva.",
};
const TXT_EVENTO: Record<string, string> = {
  preproduccion: "Cerrado con el cliente; se empieza a organizar.",
  produccion: "Proveedores, montaje y detalles en marcha.",
  confirmado: "Todo cerrado y listo.",
  en_ejecucion: "Se está celebrando.",
  finalizado: "Terminado.",
  cancelado: "Se ha cancelado.",
};

export default async function Configuracion({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const s = await getSesion();
  if (!puede(s, "configuracion")) notFound();
  const editar = puede(s, "configuracion", "editar");
  const { error, ok } = await searchParams;
  const supabase = await createClient();

  const [{ data: condiciones }, { data: estados }, { data: categorias }, { data: espacios }, { data: catProv }, { data: campanas }, { data: perfiles }, { data: roles }, { data: permisos }] = await Promise.all([
    supabase.from("condiciones_estandar").select("id, regla, valor, activa"),
    supabase.from("estados_lead").select("id, nombre, orden, color, es_ganado, es_perdido").order("orden"),
    supabase.from("categorias").select("id, nombre, padre_id, orden, activa").order("orden"),
    supabase.from("espacios").select("id, nombre, aforo, notas").order("nombre"),
    supabase.from("categorias_proveedor").select("id, nombre, orden").order("orden"),
    supabase.from("campanas").select("id, nombre, fecha_ini, fecha_fin, objetivo, activa").order("fecha_ini", { ascending: false }),
    supabase.from("perfiles").select("id, nombre, email, rol_id, activo, superadmin").order("nombre"),
    supabase.from("roles").select("id, nombre"),
    supabase.from("permisos").select("rol_id, modulo, accion"),
  ]);

  const raices = (categorias ?? []).filter((c) => !c.padre_id);
  const validacion = (condiciones ?? []).find((x) => x.regla === "condiciones_validadas");
  const validadas = Number(validacion?.valor ?? 0) === 1;
  const nombreRol = new Map((roles ?? []).map((r) => [r.id, r.nombre]));
  const pantallas = (rol: string | null, accion: string) =>
    MODULOS.filter((m) => m.modulo !== "usuarios" && (permisos ?? []).some((p) => p.rol_id === rol && p.modulo === m.modulo && p.accion === accion)).map((m) => m.nombre);

  const BLOQUES = [
    { id: "usuarios", n: 1, t: "Usuarios", d: "Quién entra, qué rol tiene y qué puede ver o editar." },
    { id: "estados", n: 2, t: "Estados", d: "Las fases por las que pasan leads, propuestas y eventos." },
    { id: "categorias", n: 3, t: "Categorías y espacios", d: "Tipos de evento y espacios del venue." },
    { id: "reglas", n: 4, t: "Reglas comerciales", d: "Cuándo Laura y Cristina avanzan solas y cuándo hace falta Groove." },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="aparecer">
        <p className="antetitulo">Recursos</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Configuración</h1>
        <p className="mt-1 text-sm text-espresso/60">Aquí se ajusta cómo funciona la app para todo el equipo. Son cuatro apartados:</p>
      </header>

      <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BLOQUES.map((b) => (
          <a key={b.id} href={`#${b.id}`} className="tarjeta tarjeta-viva aparecer block p-4">
            <p className="font-serif text-2xl text-bronze">{b.n}</p>
            <p className="font-medium">{b.t}</p>
            <p className="mt-1 text-xs text-espresso/60">{b.d}</p>
            {b.id === "reglas" && !validadas && <p className="mt-2 text-[11px] text-bronze">⚠ Pendientes de validar</p>}
          </a>
        ))}
      </nav>

      {error && <p className="tarjeta border-bronze/60 px-4 py-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="tarjeta px-4 py-3 text-sm text-olive">Guardado.</p>}

      {/* 1 · USUARIOS */}
      <Bloque id="usuarios" n={1} titulo="Usuarios" texto="Cada persona tiene un rol. El rol decide qué pantallas ve y en cuáles puede cambiar cosas.">
        <div className="divide-y divide-stone/40">
          {(perfiles ?? []).map((p) => {
            const ve = pantallas(p.rol_id, "ver");
            const edita = pantallas(p.rol_id, "editar");
            return (
              <div key={p.id} className={`grid gap-1 py-3 text-sm md:grid-cols-[1.2fr_1fr_2fr] md:items-center ${p.activo ? "" : "opacity-50"}`}>
                <div>
                  <p className="font-medium">{p.nombre}{p.superadmin && <span className="ml-2 rounded-full bg-bronze/20 px-2 py-0.5 text-[10px] text-bronze">gestiona usuarios</span>}</p>
                  <p className="text-xs text-espresso/55">{p.email}{!p.activo && " · sin acceso"}</p>
                </div>
                <p>{p.rol_id ? nombreRol.get(p.rol_id) : <span className="text-bronze">Sin rol: todavía no ve nada</span>}</p>
                <p className="text-xs text-espresso/65">
                  {ve.length ? <>Ve: {ve.join(", ")}.{edita.length > 0 && <> <span className="text-espresso">Edita: {edita.join(", ")}.</span></>}</> : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm">
          {s.superadmin
            ? <Link href="/usuarios" className={boton}>Dar de alta, cambiar roles y permisos →</Link>
            : <span className="text-espresso/60">Los cambios de usuarios los hacen las personas que gestionan usuarios.</span>}
        </p>
      </Bloque>

      <fieldset disabled={!editar} className="space-y-6">
        {/* 2 · ESTADOS */}
        <Bloque id="estados" n={2} titulo="Estados" texto="Las fases por las que pasa cada cosa. Las de leads se pueden renombrar o ampliar; las de propuestas y eventos son fijas porque de ellas dependen las aprobaciones y la conversión en evento.">
          <h3 className="mb-2 font-medium">Leads <span className="text-xs font-normal text-espresso/55">· columnas del tablero</span></h3>
          <div className="space-y-2">
            {[...(estados ?? []), null].map((e) => (
              <form key={e?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-[3.5rem_1fr_3rem_auto] items-center gap-2 md:grid-cols-[3.5rem_1fr_3rem_8rem_auto]">
                <input type="hidden" name="_tabla" value="estados_lead" />
                <input type="hidden" name="_id" value={e?.id ?? ""} />
                {e?.es_ganado && <input type="hidden" name="es_ganado" value="on" />}
                {e?.es_perdido && <input type="hidden" name="es_perdido" value="on" />}
                <input name="orden" type="number" required defaultValue={e?.orden ?? (estados?.length ?? 0) + 1} title="Orden" className={campo} />
                <input name="nombre" required defaultValue={e?.nombre ?? ""} placeholder="Añadir estado…" className={campo} />
                <input name="color" type="color" defaultValue={e?.color ?? "#c9bba6"} title="Color" className="h-8 w-full rounded border border-stone bg-cream" />
                <span className="hidden text-xs text-espresso/55 md:block">{e ? (e.es_ganado ? "Cierra ganado" : e.es_perdido ? "Cierra perdido" : "En curso") : ""}</span>
                <button className={boton}>{e ? "Guardar" : "Añadir"}</button>
              </form>
            ))}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-medium">Propuestas</h3>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(EST_PROPUESTA).map(([k, v]) => <li key={k}><b className="font-medium">{v.t}</b> <span className="text-espresso/60">— {TXT_PROPUESTA[k]}</span></li>)}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Eventos</h3>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(EST_EVENTO).map(([k, v]) => <li key={k}><b className="font-medium">{v.t}</b> <span className="text-espresso/60">— {TXT_EVENTO[k]}</span></li>)}
              </ul>
            </div>
          </div>
        </Bloque>

        {/* 3 · CATEGORÍAS Y ESPACIOS */}
        <Bloque id="categorias" n={3} titulo="Categorías y espacios" texto="Las categorías clasifican cada lead o evento. Los espacios son los lugares del venue que se pueden reservar (Groove Garden es un espacio, no una categoría).">
          <h3 className="mb-2 font-medium">Categorías</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {raices.map((r) => (
              <div key={r.id} className="rounded-xl border border-stone/50 bg-cream/40 p-3">
                <FilaCategoria c={r} principal />
                <div className="mt-2 space-y-1.5">
                  {(categorias ?? []).filter((c) => c.padre_id === r.id).map((c) => <FilaCategoria key={c.id} c={c} />)}
                  <FilaCategoria c={null} padre={r.id} />
                </div>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-6 font-medium">Espacios</h3>
          <div className="space-y-2">
            {[...(espacios ?? []), null].map((e) => (
              <form key={e?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-[1fr_6rem_auto_auto] items-center gap-2">
                <input type="hidden" name="_tabla" value="espacios" />
                <input type="hidden" name="_id" value={e?.id ?? ""} />
                <input name="nombre" required defaultValue={e?.nombre ?? ""} placeholder="Añadir espacio…" className={campo} />
                <input name="aforo" type="number" min="0" defaultValue={e?.aforo ?? ""} placeholder="Aforo" className={campo} />
                <button className={boton}>{e ? "Guardar" : "Añadir"}</button>
                {e ? <button formAction={borrarFila} formNoValidate className="rounded-lg border border-stone px-2.5 py-1.5 text-xs text-espresso/60 hover:text-red-800">Quitar</button> : <span />}
              </form>
            ))}
          </div>

          <details className="mt-6 rounded-xl border border-stone/50 bg-cream/30 p-3">
            <summary className="cursor-pointer text-sm text-espresso/70">Otras listas: campañas comerciales y tipos de proveedor</summary>
            <div className="mt-3 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-espresso/60">Campañas (p. ej. Navidad Corporativa)</p>
                <div className="space-y-2">
                  {[...(campanas ?? []), null].map((c) => (
                    <form key={c?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                      <input type="hidden" name="_tabla" value="campanas" />
                      <input type="hidden" name="_id" value={c?.id ?? ""} />
                      <input name="nombre" required defaultValue={c?.nombre ?? ""} placeholder="Añadir campaña…" className={campo} />
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="activa" defaultChecked={c?.activa ?? true} className="accent-olive" />Activa</label>
                      <button className={boton}>{c ? "✓" : "Añadir"}</button>
                    </form>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-espresso/60">Tipos de proveedor</p>
                <div className="space-y-2">
                  {[...(catProv ?? []), null].map((c) => (
                    <form key={c?.id ?? "nuevo"} action={guardarFila} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <input type="hidden" name="_tabla" value="categorias_proveedor" />
                      <input type="hidden" name="_id" value={c?.id ?? ""} />
                      <input type="hidden" name="orden" value={c?.orden ?? (catProv?.length ?? 0) + 1} />
                      <input name="nombre" required defaultValue={c?.nombre ?? ""} placeholder="Añadir tipo…" className={campo} />
                      <button className={boton}>{c ? "✓" : "Añadir"}</button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </Bloque>

        {/* 4 · REGLAS COMERCIALES */}
        <Bloque id="reglas" n={4} titulo="Reglas comerciales" texto="Las condiciones acordadas con Groove. Dentro de estas reglas, Laura y Cristina envían propuestas sin pedir permiso. Si una propuesta se sale, la app pide la aprobación de Groove antes de enviarla.">
          {!validadas ? (
            <div className="mb-4 rounded-xl border border-bronze/50 bg-bronze/10 px-4 py-3">
              <p className="font-medium text-bronze">⚠ Condiciones comerciales pendientes de validar con Groove</p>
              <p className="mt-1 text-sm text-espresso/70">Los valores de abajo son provisionales, solo para poder probar la app. No son reglas acordadas. Cuando Groove confirme las condiciones reales, se escriben aquí y se marca como validado.</p>
            </div>
          ) : (
            <p className="mb-4 rounded-xl bg-olive/10 px-4 py-3 text-sm text-olive-deep">✓ Condiciones validadas con Groove.</p>
          )}

          <div className="divide-y divide-stone/40">
            {REGLAS.map((r) => {
              const c = (condiciones ?? []).find((x) => x.regla === r.regla);
              return (
                <form key={r.regla} action={guardarFila} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 md:grid-cols-[1fr_9rem_auto_auto]">
                  <input type="hidden" name="_tabla" value="condiciones_estandar" />
                  <input type="hidden" name="_id" value={c?.id ?? ""} />
                  <input type="hidden" name="regla" value={r.regla} />
                  <div>
                    <p className="text-sm font-medium">{r.nombre}
                      {c && !validadas && <span className="ml-2 rounded-full bg-bronze/15 px-2 py-0.5 text-[10px] text-bronze">provisional</span>}
                      {!c && <span className="ml-2 text-[11px] text-espresso/45">sin definir</span>}
                    </p>
                    <p className="text-xs text-espresso/55">{r.ayuda}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input name="valor" type="number" step="0.01" min="0" required defaultValue={c?.valor ?? ""} placeholder="—" className={campo} />
                    <span className="text-sm text-espresso/60">{r.unidad}</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs" title="Si se desmarca, esta regla no se comprueba">
                    <input type="checkbox" name="activa" defaultChecked={c?.activa ?? true} className="accent-olive" />Se aplica
                  </label>
                  <button className={boton}>Guardar</button>
                </form>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-espresso/60">
            Además, ahora mismo la app también pide aprobación cuando una propuesta incluye un proveedor que no está en el catálogo. Es una comprobación provisional: falta decidir con Groove si se mantiene.
          </p>

          <form action={guardarFila} className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-stone/50 pt-4">
            <input type="hidden" name="_tabla" value="condiciones_estandar" />
            <input type="hidden" name="_id" value={validacion?.id ?? ""} />
            <input type="hidden" name="regla" value="condiciones_validadas" />
            <input type="hidden" name="valor" value={validadas ? "0" : "1"} />
            <input type="hidden" name="activa" value="on" />
            <span className="text-xs text-espresso/55">{validadas ? "¿Hay que revisarlas otra vez?" : "Márcalo solo cuando Groove haya confirmado los valores."}</span>
            <button className={validadas ? "rounded-lg border border-stone px-3 py-1.5 text-xs" : boton}>
              {validadas ? "Volver a marcar como pendientes" : "Groove ha validado estas condiciones"}
            </button>
          </form>
        </Bloque>
      </fieldset>
    </div>
  );
}

function Bloque({ id, n, titulo, texto, children }: { id: string; n: number; titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <section id={id} className="tarjeta aparecer scroll-mt-6 p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-olive text-sm text-cream">{n}</span>
        <div>
          <h2 className="font-serif text-xl">{titulo}</h2>
          <p className="text-sm text-espresso/60">{texto}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

type Cat = { id: string; nombre: string; padre_id: string | null; orden: number; activa: boolean };

function FilaCategoria({ c, padre, principal }: { c: Cat | null; padre?: string; principal?: boolean }) {
  return (
    <form action={guardarFila} className="flex items-center gap-1.5">
      <input type="hidden" name="_tabla" value="categorias" />
      <input type="hidden" name="_id" value={c?.id ?? ""} />
      <input type="hidden" name="padre_id" value={c?.padre_id ?? padre ?? ""} />
      <input type="hidden" name="orden" value={c?.orden ?? 99} />
      {c && c.activa && <input type="hidden" name="activa" value="on" />}
      {!c && <input type="hidden" name="activa" value="on" />}
      <input name="nombre" required defaultValue={c?.nombre ?? ""} placeholder={padre ? "Añadir…" : "Nueva categoría"}
        className={`${campo} ${principal ? "font-serif text-base font-medium" : ""} ${c && !c.activa ? "line-through opacity-60" : ""}`} />
      <button className={boton}>{c ? "✓" : "+"}</button>
    </form>
  );
}
