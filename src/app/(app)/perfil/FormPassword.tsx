"use client";

import { useActionState } from "react";
import { cambiarMiPassword } from "./actions";

const campo = "w-full rounded-xl border border-stone bg-cream/80 px-4 py-2.5 outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/15";

export function FormPassword() {
  const [res, action, pending] = useActionState(cambiarMiPassword, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5"><span className="text-xs text-espresso/60">Nueva contraseña</span>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" className={campo} /></label>
      <label className="block space-y-1.5"><span className="text-xs text-espresso/60">Repítela</span>
        <input name="repetir" type="password" minLength={8} required autoComplete="new-password" className={campo} /></label>
      {res && <p className={`text-sm ${res === "ok" ? "text-olive" : "text-red-800"}`}>{res === "ok" ? "Contraseña actualizada." : res}</p>}
      <button disabled={pending} className="rounded-full bg-olive px-6 py-2.5 text-sm text-cream hover:bg-olive-deep disabled:opacity-60">
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
