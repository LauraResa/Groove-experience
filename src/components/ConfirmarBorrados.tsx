"use client";

import { useEffect } from "react";

/** Pide confirmación antes de enviar cualquier formulario o botón marcado con data-confirmar */
export function ConfirmarBorrados() {
  useEffect(() => {
    const alEnviar = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      const boton = e.submitter as HTMLElement | null;
      if (!form.hasAttribute("data-confirmar") && !boton?.hasAttribute("data-confirmar")) return;
      if (!window.confirm("¿Seguro que quieres borrarlo? No se puede deshacer.")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("submit", alEnviar, true);
    return () => document.removeEventListener("submit", alEnviar, true);
  }, []);
  return null;
}
