"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cambiarPasswordDe, crearUsuario } from "./actions";

const campo = "w-full rounded-lg border border-stone bg-cream/80 px-3 py-2 text-sm outline-none focus:border-olive";

export function NuevoUsuario({ roles }: { roles: { id: string; clave: string; nombre: string }[] }) {
  const [res, action, pending] = useActionState(crearUsuario, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (res === "ok") form.current?.reset(); }, [res]);

  return (
    <form ref={form} action={action} className="grid gap-3 md:grid-cols-6 items-end">
      <label className="md:col-span-1 space-y-1"><span className="text-xs text-espresso/60">Nombre</span><input name="nombre" required className={campo} /></label>
      <label className="md:col-span-2 space-y-1"><span className="text-xs text-espresso/60">Email</span><input name="email" type="email" required className={campo} /></label>
      <label className="md:col-span-1 space-y-1"><span className="text-xs text-espresso/60">Contraseña</span><input name="password" type="text" minLength={8} required className={campo} placeholder="mín. 8" /></label>
      <label className="md:col-span-1 space-y-1"><span className="text-xs text-espresso/60">Rol</span>
        <select name="rol" className={campo}>{roles.map((r) => <option key={r.id} value={r.clave}>{r.nombre}</option>)}</select>
      </label>
      <div className="md:col-span-1 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="superadmin" className="accent-olive" /> Superadmin</label>
        <button disabled={pending} className="ml-auto rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep disabled:opacity-60">
          {pending ? "…" : "Crear"}
        </button>
      </div>
      {res && <p className={`md:col-span-6 text-sm ${res === "ok" ? "text-olive" : "text-red-800"}`}>{res === "ok" ? "Usuario creado. Ya puede entrar con su email y contraseña." : res}</p>}
    </form>
  );
}

export function CambiarPassword({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [res, action, pending] = useActionState(cambiarPasswordDe, null);
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="text-xs text-olive hover:text-bronze">Nueva contraseña</button>;
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input name="password" type="text" minLength={8} required placeholder="mín. 8" className="w-28 rounded border border-stone bg-cream px-2 py-1 text-xs" />
      <button disabled={pending} className="rounded bg-olive px-2 py-1 text-xs text-cream">{pending ? "…" : "OK"}</button>
      {res && <span className={`text-xs ${res === "ok" ? "text-olive" : "text-red-800"}`}>{res === "ok" ? "✓" : res}</span>}
    </form>
  );
}
