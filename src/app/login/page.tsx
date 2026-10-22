"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="relative min-h-screen grid place-items-center px-4 overflow-hidden">
      <div aria-hidden className="respirar absolute -top-32 -right-24 h-96 w-96 rounded-full bg-bronze/25 blur-3xl" />
      <div aria-hidden className="respirar absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-olive/25 blur-3xl" style={{ animationDelay: "-7s" }} />

      <form action={action} className="tarjeta aparecer relative w-full max-w-sm p-8 md:p-10 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-[10px] tracking-[0.5em] text-bronze">THE</p>
          <h1 className="font-serif text-4xl leading-none">Groove</h1>
          <p className="font-serif italic text-xl text-olive">Experience</p>
          <div className="mx-auto mt-4 h-px w-12 bg-bronze/60" />
        </div>
        <label className="block space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-espresso/60">Email</span>
          <input name="email" type="email" required autoComplete="email"
            className="w-full rounded-xl border border-stone bg-cream/80 px-4 py-2.5 outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/15" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-espresso/60">Contraseña</span>
          <input name="password" type="password" required autoComplete="current-password"
            className="w-full rounded-xl border border-stone bg-cream/80 px-4 py-2.5 outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/15" />
        </label>
        {error && <p className="text-sm text-red-800">{error}</p>}
        <p className="text-right -mt-3"><Link href="/login/recuperar" className="text-xs text-olive hover:text-bronze">¿Has olvidado tu contraseña?</Link></p>
        <button disabled={pending}
          className="w-full rounded-full bg-olive text-cream py-3 font-medium tracking-wide shadow-lg shadow-olive/30 transition hover:bg-olive-deep hover:-translate-y-px disabled:opacity-60">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
