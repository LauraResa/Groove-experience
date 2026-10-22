import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion } from "@/lib/sesion";
import { ACCIONES, MODULOS } from "@/lib/modulos";
import { actualizarUsuario, alternarPermiso } from "./actions";
import { CambiarPassword, NuevoUsuario } from "./Formularios";

export default async function Usuarios() {
  const s = await getSesion();
  if (!s.superadmin) notFound();
  const supabase = await createClient();

  const [{ data: roles }, { data: perfiles }, { data: permisos }] = await Promise.all([
    supabase.from("roles").select("id, clave, nombre").order("clave"),
    supabase.from("perfiles").select("id, nombre, email, rol_id, superadmin, activo, creado_en").order("creado_en"),
    supabase.from("permisos").select("rol_id, modulo, accion"),
  ]);

  const rs = roles ?? [];
  const tiene = (rol: string | null, modulo: string, accion: string) =>
    !!rol && (permisos ?? []).some((p) => p.rol_id === rol && p.modulo === modulo && p.accion === accion);
  const modulos = MODULOS.filter((m) => m.modulo !== "usuarios");

  return (
    <div className="space-y-8 max-w-7xl">
      <header className="aparecer">
        <p className="antetitulo">Superadmin</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Usuarios y permisos</h1>
        <p className="text-sm text-espresso/60 mt-1">Alta de usuarios, rol de cada persona y qué pantallas ve cada rol.</p>
      </header>

      <section className="tarjeta p-5 md:p-6 aparecer">
        <h2 className="font-serif text-lg mb-4">Nuevo usuario</h2>
        <NuevoUsuario roles={rs} />
      </section>

      <section className="tarjeta overflow-hidden aparecer">
        <h2 className="font-serif text-lg px-5 py-4 border-b border-stone/60">Usuarios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                <th className="px-5 py-3 font-medium">Persona</th>
                <th className="px-5 py-3 font-medium">Rol y acceso</th>
                <th className="px-5 py-3 font-medium">Pantallas que ve</th>
                <th className="px-5 py-3 font-medium">Contraseña</th>
              </tr>
            </thead>
            <tbody>
              {(perfiles ?? []).map((p) => {
                const ve = modulos.filter((m) => tiene(p.rol_id, m.modulo, "ver"));
                return (
                  <tr key={p.id} className={`border-t border-stone/40 align-top ${!p.rol_id || !p.activo ? "bg-bronze/5" : ""}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{p.nombre} {p.superadmin && <span className="ml-1 rounded-full bg-bronze/20 px-2 py-0.5 text-[10px] text-bronze">superadmin</span>}</p>
                      <p className="text-xs text-espresso/55">{p.email}</p>
                      {!p.rol_id && <p className="mt-1 text-xs text-bronze">Sin rol: no ve nada</p>}
                    </td>
                    <td className="px-5 py-3">
                      <form action={actualizarUsuario} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="rol_id" defaultValue={p.rol_id ?? ""} className="rounded border border-stone bg-cream px-2 py-1 text-xs">
                          <option value="">Sin rol</option>
                          {rs.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="activo" defaultChecked={p.activo} className="accent-olive" />Activo</label>
                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="superadmin" defaultChecked={p.superadmin} className="accent-olive" />Superadmin</label>
                        <button className="rounded bg-olive px-2.5 py-1 text-xs text-cream hover:bg-olive-deep">Guardar</button>
                      </form>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {ve.length ? ve.map((m) => <span key={m.modulo} className="rounded-full bg-olive/10 px-2 py-0.5 text-[11px] text-olive-deep">{m.nombre}</span>)
                          : <span className="text-xs text-espresso/45">Ninguna</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3"><CambiarPassword id={p.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta overflow-hidden aparecer">
        <div className="px-5 py-4 border-b border-stone/60">
          <h2 className="font-serif text-lg">Permisos por rol</h2>
          <p className="text-xs text-espresso/55 mt-1">Pulsa para activar o quitar. «Ver» decide si la pantalla aparece en el menú.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-espresso/50">
                <th className="px-5 py-3 font-medium">Pantalla</th>
                {rs.map((r) => <th key={r.id} className="px-5 py-3 font-medium">{r.nombre}</th>)}
              </tr>
            </thead>
            <tbody>
              {modulos.map((m) => (
                <tr key={m.modulo} className="border-t border-stone/40">
                  <td className="px-5 py-3 font-medium whitespace-nowrap">{m.nombre}</td>
                  {rs.map((r) => (
                    <td key={r.id} className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ACCIONES.map((a) => {
                          const on = tiene(r.id, m.modulo, a.clave);
                          return (
                            <form key={a.clave} action={alternarPermiso}>
                              <input type="hidden" name="rol_id" value={r.id} />
                              <input type="hidden" name="modulo" value={m.modulo} />
                              <input type="hidden" name="accion" value={a.clave} />
                              <input type="hidden" name="activo" value={on ? "1" : "0"} />
                              <button className={`rounded-full px-2 py-0.5 text-[11px] border transition ${
                                on ? "bg-olive border-olive text-cream" : "border-stone text-espresso/45 hover:border-olive hover:text-olive"
                              } ${a.clave === "ver" ? "font-semibold" : ""}`}>{a.nombre}</button>
                            </form>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
