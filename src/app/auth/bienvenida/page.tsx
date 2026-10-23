"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Destino del email de invitación o de acceso: abre la sesión y lleva a crear la contraseña */
export default function Bienvenida() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ir = () => window.location.replace("/perfil?nueva=1");
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);

    const fallo = hash.get("error_description") ?? query.get("error_description");
    if (fallo) { setError(fallo); return; }

    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const token_hash = query.get("token_hash");
    const type = query.get("type") as "invite" | "recovery" | null;
    const code = query.get("code");

    (async () => {
      const { error } = access_token && refresh_token
        ? await supabase.auth.setSession({ access_token, refresh_token })
        : token_hash && type
          ? await supabase.auth.verifyOtp({ token_hash, type })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error("El enlace no es válido o ya se ha usado.") };
      if (error) setError(error.message); else ir();
    })();
  }, []);

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="tarjeta aparecer w-full max-w-sm p-8 text-center space-y-3">
        <p className="text-[10px] tracking-[0.5em] text-bronze">THE GROOVE EXPERIENCE</p>
        {error ? (
          <>
            <h1 className="font-serif text-2xl">El enlace no funciona</h1>
            <p className="text-sm text-espresso/70">{error}</p>
            <p className="text-sm">Pide que te reenvíen el acceso o <Link href="/login/recuperar" className="text-olive hover:text-bronze">solicita uno nuevo</Link>.</p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl">Te damos la bienvenida</h1>
            <p className="text-sm text-espresso/70">Preparando tu acceso…</p>
          </>
        )}
      </div>
    </main>
  );
}
