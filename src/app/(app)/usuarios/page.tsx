import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion } from "@/lib/sesion";
import { ACCIONES, MODULOS } from "@/lib/modulos";
import { actualizarUsuario, alternarPermiso, borrarRol, crearRol, guardarRol } from "./actions";
import { CambiarPassword, NuevoUsuario } from "./Formularios";

const campo = "rounded-lg border border-stone bg-cream/80 px-3 py-2 text-sm outline-none focus:border-olive";
const boton = "rounded-lg bg-olive px-3.5 py-2 text-xs text-cream hover:bg-olive-deep transition";

type Perfil = { id: string; nombre: string; email: string; rol_id: string | null; superadmin: boolean; activo: boolean };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ vista?: string; perfil?: string }> }) {
  const s = await getSesion();
  if (!s.superadmin) notFound();
  const { vista = "usuarios", perfil } = await searchParams;
  const supabase = await createClient();

  const [{ data: roles }, { data: perfiles }, { data: permisos }] = await Promise.all([
    supabase.from("roles").select("id, clave, nombre, descripcion").order("nombre"),
    supabase.from("perfiles").select("id, nombre, email, rol_id, superadmin, activo, creado_en").order("nombre"),
    supabase.from("permisos").select("rol_id, modulo, accion"),
  ]);

  const rs = roles ?? [];
  const ps = (perfiles ?? []) as Perfil[];
  const modulos = MODULOS.filter((m) => m.modulo !== "usuarios");
  const tiene = (rol: string | null, modulo: string, accion: string) =>
    !!rol && (permisos ?? []).some((p) => p.rol_id === rol && p.modulo === modulo && p.accion === accion);
  const pantallas = (rol: string | null) => modulos.filter((m) => tiene(rol, m.modulo, "ver"));
  const pendientes = ps.filter((p) => !p.rol_id);
  const conPerfil = ps.filter((p) => p.rol_id);
  const sel = rs.find((r) => r.id === perfil) ?? rs[0];

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="aparecer">
        <p className="antetitulo">Superadmin</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Usuarios y permisos</h1>
      </header>

      <nav className="flex gap-1 rounded-xl bg-stone/30 p-1 w-fit">
        <Pestana href="/usuarios" activa={vista === "usuarios"}>Usuarios <span className="text-espresso/50">{ps.length}</span></Pestana>
        <Pestana href="/usuarios?vista=perfiles" activa={vista === "perfiles"}>Perfiles y permisos <span className="text-espresso/50">{rs.length}</span></Pestana>
      </nav>

      {vista === "usuarios" ? (
        <>
          <details className="tarjeta aparecer group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="font-serif text-lg">Nuevo usuario</span>
              <span className="rounded-full bg-olive px-3 py-1 text-xs text-cream group-open:hidden">+ Añadir</span>
              <span className="hidden text-xs text-espresso/50 group-open:inline">Cerrar</span>
            </summary>
            <div className="border-t border-stone/50 px-5 py-5"><NuevoUsuario roles={rs} /></div>
          </details>

          {pendientes.length > 0 && (
            <Grupo titulo="Pendientes de perfil" texto="Han entrado o se han dado de alta pero todavía no ven nada. Asígnales un perfil." aviso>
              {pendientes.map((p) => <FilaUsuario key={p.id} p={p} roles={rs} ve={[]} />)}
            </Grupo>
          )}

          <Grupo titulo="Con acceso" texto={`${conPerfil.length} personas`}>
            {conPerfil.map((p) => <FilaUsuario key={p.id} p={p} roles={rs} ve={pantallas(p.rol_id).map((m) => m.nombre)} />)}
          </Grupo>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[17rem_1fr] aparecer">
          <aside className="tarjeta h-fit overflow-hidden">
            <p className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.15em] text-espresso/50">Perfiles</p>
            <ul>
              {rs.map((r) => {
                const usan = ps.filter((p) => p.rol_id === r.id).length;
                const activo = sel?.id === r.id;
                return (
                  <li key={r.id}>
                    <Link href={`/usuarios?vista=perfiles&perfil=${r.id}`}
                      className={`flex items-center justify-between gap-2 border-l-2 px-4 py-2.5 text-sm transition ${activo ? "border-bronze bg-cream/70 font-medium" : "border-transparent hover:bg-cream/40"}`}>
                      <span className="truncate">{r.nombre}</span>
                      <span className="shrink-0 rounded-full bg-stone/40 px-2 text-[11px] text-espresso/60">{usan}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <form action={crearRol} className="space-y-2 border-t border-stone/50 p-4">
              <p className="text-xs font-medium">Nuevo perfil</p>
              <input name="nombre" required placeholder="Nombre (p. ej. Comercial)" className={`${campo} w-full`} />
              <select name="base" className={`${campo} w-full`}>
                <option value="">Empezar sin permisos</option>
                {rs.map((r) => <option key={r.id} value={r.id}>Copiar de {r.nombre}</option>)}
              </select>
              <button className={`${boton} w-full`}>Crear perfil</button>
            </form>
          </aside>

          {sel && (
            <section className="tarjeta overflow-hidden">
              <form action={guardarRol} className="space-y-3 border-b border-stone/50 p-5">
                <input type="hidden" name="id" value={sel.id} />
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex-1 min-w-56 space-y-1">
                    <span className="text-xs text-espresso/60">Nombre del perfil</span>
                    <input name="nombre" required defaultValue={sel.nombre} key={`n-${sel.id}`} className={`${campo} w-full font-serif text-lg`} />
                  </label>
                  <button className={boton}>Guardar nombre</button>
                  {ps.every((p) => p.rol_id !== sel.id) && (
                    <button formAction={borrarRol} className="rounded-lg border border-stone px-3.5 py-2 text-xs text-espresso/60 hover:border-red-800 hover:text-red-800">Borrar perfil</button>
                  )}
                </div>
                <input name="descripcion" defaultValue={sel.descripcion ?? ""} key={`d-${sel.id}`} placeholder="Descripción: para quién es este perfil" className={`${campo} w-full`} />
                <p className="text-xs text-espresso/55">
                  {ps.filter((p) => p.rol_id === sel.id).map((p) => p.nombre).join(", ") || "Nadie usa este perfil todavía."}
                </p>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                      <th className="px-5 py-3 text-left font-medium">Pantalla</th>
                      {ACCIONES.map((a) => <th key={a.clave} className="px-2 py-3 text-center font-medium">{a.nombre}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {modulos.map((m) => {
                      const ve = tiene(sel.id, m.modulo, "ver");
                      return (
                        <tr key={m.modulo} className={`border-t border-stone/40 ${ve ? "" : "text-espresso/45"}`}>
                          <td className="px-5 py-2.5 font-medium whitespace-nowrap">{m.nombre}</td>
                          {ACCIONES.map((a) => {
                            const on = tiene(sel.id, m.modulo, a.clave);
                            return (
                              <td key={a.clave} className="px-2 py-2.5 text-center">
                                <form action={alternarPermiso}>
                                  <input type="hidden" name="rol_id" value={sel.id} />
                                  <input type="hidden" name="modulo" value={m.modulo} />
                                  <input type="hidden" name="accion" value={a.clave} />
                                  <input type="hidden" name="activo" value={on ? "1" : "0"} />
                                  <button aria-label={`${a.nombre} ${m.nombre}`}
                                    className={`grid h-7 w-7 mx-auto place-items-center rounded-full border transition ${
                                      on ? "border-olive bg-olive text-cream" : "border-stone text-transparent hover:border-olive hover:text-olive/40"
                                    }`}>
                                    ✓
                                  </button>
                                </form>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 text-xs text-espresso/55 border-t border-stone/40">«Ver» hace que la pantalla aparezca en el menú. Sin «Ver», el resto no tiene efecto.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Pestana({ href, activa, children }: { href: string; activa: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-lg px-4 py-2 text-sm transition ${activa ? "bg-cream shadow-sm font-medium" : "text-espresso/65 hover:text-espresso"}`}>
      {children}
    </Link>
  );
}

function Grupo({ titulo, texto, aviso, children }: { titulo: string; texto?: string; aviso?: boolean; children: React.ReactNode }) {
  return (
    <section className={`tarjeta aparecer overflow-hidden ${aviso ? "border-bronze/50" : ""}`}>
      <div className={`px-5 py-4 border-b border-stone/50 ${aviso ? "bg-bronze/10" : ""}`}>
        <h2 className="font-serif text-lg">{titulo}</h2>
        {texto && <p className="text-xs text-espresso/55">{texto}</p>}
      </div>
      <div className="divide-y divide-stone/40">{children}</div>
    </section>
  );
}

function FilaUsuario({ p, roles, ve }: { p: Perfil; roles: { id: string; nombre: string }[]; ve: string[] }) {
  return (
    <div className={`grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1fr_auto] md:items-center ${p.activo ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-sm font-semibold">{p.nombre.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <input form={`u-${p.id}`} name="nombre" defaultValue={p.nombre} required
              className="min-w-0 w-full rounded border border-transparent bg-transparent px-1 font-medium hover:border-stone focus:border-olive focus:bg-cream outline-none" />
            {p.superadmin && <span className="shrink-0 rounded-full bg-bronze/20 px-2 py-0.5 text-[10px] text-bronze">superadmin</span>}
          </div>
          <p className="truncate px-1 text-xs text-espresso/55">{p.email}</p>
        </div>
      </div>

      <form id={`u-${p.id}`} action={actualizarUsuario} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input type="hidden" name="id" value={p.id} />
        <select name="rol_id" defaultValue={p.rol_id ?? ""} className={`${campo} py-1.5`}>
          <option value="">Sin perfil</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="activo" defaultChecked={p.activo} className="accent-olive" />Activo</label>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="superadmin" defaultChecked={p.superadmin} className="accent-olive" />Superadmin</label>
      </form>

      <div className="flex items-center gap-3 md:justify-end">
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full bg-olive/10 px-2.5 py-1 text-xs text-olive-deep">{ve.length} pantallas</summary>
          <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-stone bg-cream p-3 shadow-xl">
            {ve.length ? <div className="flex flex-wrap gap-1">{ve.map((n) => <span key={n} className="rounded-full bg-olive/10 px-2 py-0.5 text-[11px]">{n}</span>)}</div>
              : <p className="text-xs text-espresso/50">No ve ninguna pantalla.</p>}
          </div>
        </details>
        <CambiarPassword id={p.id} />
        <button form={`u-${p.id}`} className={boton}>Guardar</button>
      </div>
    </div>
  );
}
