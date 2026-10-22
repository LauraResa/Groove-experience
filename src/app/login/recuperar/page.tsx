"use client";

import Link from "next/link";
import { useActionState } from "react";
import { recuperar } from "./actions";

export default function Recuperar() {
  const [res, action, pending] = useActionState(recuperar, null);
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form action={action} className="tarjeta aparecer w-full max-w-sm p-8 md:p-10 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-[10px] tracking-[0.5em] text-bronze">THE GROOVE EXPERIENCE</p>
          <h1 className="font-serif text-3xl">Recuperar contraseña</h1>
        </div>
        {res === "ok" ? (
          <p className="text-sm text-center">Si el email está registrado, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.</p>
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-espresso/60">Email</span>
              <input name="email" type="email" required autoComplete="email"
                className="w-full rounded-xl border border-stone bg-cream/80 px-4 py-2.5 outline-none focus:border-olive focus:ring-4 focus:ring-olive/15" />
            </label>
            <button disabled={pending} className="w-full rounded-full bg-olive text-cream py-3 hover:bg-olive-deep disabled:opacity-60">
              {pending ? "Enviando…" : "Enviar enlace"}
            </button>
          </>
        )}
        <p className="text-center"><Link href="/login" className="text-xs text-olive hover:text-bronze">← Volver</Link></p>
      </form>
    </main>
  );
}
