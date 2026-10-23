"use client";

import { useRouter } from "next/navigation";

/** Activa / desactiva los avisos de solape; se recuerda en este navegador (cookie) */
export function AvisosSolape({ activos, cuantos }: { activos: boolean; cuantos: number }) {
  const router = useRouter();
  const cambiar = () => {
    document.cookie = `cal_avisos=${activos ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <button type="button" onClick={cambiar} title={activos ? "Ocultar los avisos de solape" : "Mostrar los avisos de solape"}
      className={`rounded-lg border px-3 py-1 text-xs transition ${activos ? "border-bronze/50 text-bronze" : "border-stone text-espresso/55"}`}>
      ⚠ Avisos de solape: {activos ? `Sí${cuantos ? ` (${cuantos})` : ""}` : "No"}
    </button>
  );
}
