"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form action={action} className="w-full max-w-sm rounded-2xl bg-sand/60 border border-stone p-8 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs tracking-[0.3em] text-bronze">THE</p>
          <h1 className="font-serif text-3xl">Groove Experience</h1>
        </div>
        <label className="block space-y-1">
          <span className="text-sm">Email</span>
          <input name="email" type="email" required autoComplete="email"
            className="w-full rounded-lg border border-stone bg-cream px-3 py-2 outline-none focus:border-olive" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Contraseña</span>
          <input name="password" type="password" required autoComplete="current-password"
            className="w-full rounded-lg border border-stone bg-cream px-3 py-2 outline-none focus:border-olive" />
        </label>
        {error && <p className="text-sm text-red-800">{error}</p>}
        <button disabled={pending}
          className="w-full rounded-lg bg-olive text-cream py-2 font-medium hover:bg-olive-deep disabled:opacity-60">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
