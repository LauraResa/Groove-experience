"use client";

import { useActionState, useEffect, useRef } from "react";
import { enviarAcceso, invitarUsuario } from "./actions";

const campo = "w-full rounded-lg border border-stone bg-cream/80 px-3 py-2 text-sm outline-none focus:border-olive";

export function NuevoUsuario({ roles }: { roles: { id: string; clave: string; nombre: string; descripcion?: string | null }[] }) {
  const [res, action, pending] = useActionState(invitarUsuario, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (res === "ok") form.current?.reset(); }, [res]);

  return (
    <form ref={form} action={action} className="grid gap-3 md:grid-cols-6 items-end">
      <label className="md:col-span-1 space-y-1"><span className="text-xs text-espresso/60">Nombre</span><input name="nombre" required className={campo} /></label>
      <label className="md:col-span-3 space-y-1"><span className="text-xs text-espresso/60">Email</span><input name="email" type="email" required className={campo} /></label>
      <label className="md:col-span-1 space-y-1"><span className="text-xs text-espresso/60">Perfil</span>
        <select name="rol" className={campo}>{roles.map((r) => <option key={r.id} value={r.clave}>{r.nombre}</option>)}</select>
      </label>
      <div className="md:col-span-1 flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="superadmin" className="accent-olive" /> Superadmin</label>
        <button disabled={pending} className="ml-auto rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep disabled:opacity-60">
          {pending ? "…" : "Invitar"}
        </button>
      </div>
      {res && <p className={`md:col-span-6 text-sm ${res === "ok" ? "text-olive" : "text-red-800"}`}>{res === "ok" ? "Invitación enviada. Recibirá un email para crear su propia contraseña." : res}</p>}
    </form>
  );
}

export function EnviarAcceso({ email }: { email: string }) {
  const [res, action, pending] = useActionState(enviarAcceso, null);
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="email" value={email} />
      <button disabled={pending} className="text-xs text-olive hover:text-bronze disabled:opacity-60" title="Le llega un email para crear o restablecer su contraseña">
        {pending ? "Enviando…" : "Enviar acceso"}
      </button>
      {res && <span className={`text-xs ${res === "ok" ? "text-olive" : "text-red-800"}`}>{res === "ok" ? "✓ enviado" : res}</span>}
    </form>
  );
}
