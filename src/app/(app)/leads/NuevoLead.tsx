"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearLead } from "./actions";

type Opcion = { id: string; nombre: string };

const campo = "w-full rounded-lg border border-stone bg-cream px-3 py-2 text-sm outline-none focus:border-olive";

export function NuevoLead({ estados, categorias, campanas, responsables }: {
  estados: Opcion[]; categorias: Opcion[]; campanas: Opcion[]; responsables: Opcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [res, action, pending] = useActionState(crearLead, null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (res === "ok") { form.current?.reset(); setAbierto(false); }
  }, [res]);

  return (
    <>
      <button onClick={() => setAbierto(true)} className="rounded-lg bg-olive text-cream px-4 py-2 text-sm hover:bg-olive-deep">
        + Nuevo lead
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-espresso/30" onClick={() => setAbierto(false)}>
          <form ref={form} action={action} onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-lg overflow-y-auto bg-cream p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="font-serif text-2xl">Nuevo lead</h2>
              <button type="button" onClick={() => setAbierto(false)} className="text-sm">Cerrar</button>
            </div>
            <L t="Título / oportunidad"><input name="titulo" required className={campo} placeholder="Cena Navidad ACME" /></L>
            <div className="grid grid-cols-2 gap-3">
              <L t="Empresa / cliente"><input name="empresa" className={campo} /></L>
              <L t="Tipo"><select name="tipo_cliente" className={campo}>
                {["empresa","marca","agencia","particular","partner","comunidad"].map((t) => <option key={t}>{t}</option>)}
              </select></L>
              <L t="Contacto"><input name="contacto" className={campo} /></L>
              <L t="Email"><input name="email" type="email" className={campo} /></L>
              <L t="Teléfono"><input name="telefono" className={campo} /></L>
              <L t="Origen"><input name="origen" className={campo} placeholder="web, referido, instagram…" /></L>
              <L t="Categoría"><Sel name="categoria_id" ops={categorias} vacio /></L>
              <L t="Campaña"><Sel name="campana_id" ops={campanas} vacio /></L>
              <L t="Fecha prevista"><input name="fecha_prevista" type="date" className={campo} /></L>
              <L t="Asistentes"><input name="asistentes" type="number" min="0" className={campo} /></L>
              <L t="Presupuesto estimado (€)"><input name="presupuesto" type="number" min="0" step="0.01" className={campo} /></L>
              <L t="Prioridad"><select name="prioridad" defaultValue="media" className={campo}>
                {["baja","media","alta","urgente"].map((p) => <option key={p}>{p}</option>)}
              </select></L>
              <L t="Responsable"><Sel name="responsable_id" ops={responsables} vacio /></L>
              <L t="Estado"><Sel name="estado_id" ops={estados} /></L>
              <L t="Próxima acción"><input name="proxima_accion" className={campo} /></L>
              <L t="Fecha próxima acción"><input name="fecha_proxima_accion" type="date" className={campo} /></L>
            </div>
            <L t="Notas"><textarea name="notas" rows={3} className={campo} /></L>
            {res && res !== "ok" && <p className="text-sm text-red-800">{res}</p>}
            <button disabled={pending} className="w-full rounded-lg bg-olive text-cream py-2 hover:bg-olive-deep disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar lead"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs text-espresso/70">{t}</span>{children}</label>;
}

function Sel({ name, ops, vacio }: { name: string; ops: Opcion[]; vacio?: boolean }) {
  return (
    <select name={name} className={campo} defaultValue={vacio ? "" : ops[0]?.id}>
      {vacio && <option value="">—</option>}
      {ops.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
    </select>
  );
}
