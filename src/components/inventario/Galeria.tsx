"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/client";
import { borrarFoto, fotoPrincipal, registrarFotos } from "@/app/(app)/inventario/actions";
import { SinFoto } from "./Silueta";

type F = { id: string; url: string };

/** Reduce la foto en el navegador (máx. 2000 px, JPEG) para que suba rápido y el catálogo cargue ligero */
async function preparar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b ?? file), "image/jpeg", 0.86));
  } catch { return file; }
}

export function Galeria({ itemId, fotos, editable, slug, codigo, nombre }: { itemId: string; fotos: F[]; editable: boolean; slug?: string; codigo?: string | null; nombre: string }) {
  const [sel, setSel] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pend, iniciar] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const sustituir = useRef<string | undefined>(undefined);
  const router = useRouter();
  const actual = fotos[Math.min(sel, fotos.length - 1)];

  async function subir(lista: FileList | null) {
    if (!lista?.length) return;
    setError(null);
    const sb = clienteNavegador();
    const paths: string[] = [];
    for (const [k, file] of [...lista].entries()) {
      setEstado(`Subiendo ${k + 1} de ${lista.length}…`);
      const blob = await preparar(file);
      const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `items/${itemId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("inventario").upload(path, blob, { contentType: blob.type || file.type, cacheControl: "31536000" });
      if (error) { setError(`No se ha podido subir «${file.name}». ${error.message.includes("row-level") ? "No tienes permiso para editar el inventario." : error.message}`); break; }
      paths.push(path);
    }
    if (paths.length) {
      const e = await registrarFotos(itemId, paths, sustituir.current);
      if (e) setError(e);
      if (sustituir.current) setSel(sel); else setSel(fotos.length);
    }
    sustituir.current = undefined;
    setEstado(null);
    if (input.current) input.current.value = "";
    iniciar(() => router.refresh());
  }

  const accion = (fn: () => Promise<string | null>) => iniciar(async () => { const e = await fn(); if (e) setError(e); router.refresh(); });
  const ocupado = Boolean(estado) || pend;

  return (
    <div className="space-y-3">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-stone/60 bg-sand/40">
        {actual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={actual.id} src={actual.url} alt={nombre} className="aparecer h-full w-full object-cover" />
        ) : <SinFoto slug={slug} codigo={codigo} />}
        {ocupado && <div className="absolute inset-0 grid place-items-center bg-cream/60 text-sm backdrop-blur-sm">{estado ?? "Guardando…"}</div>}
        {editable && actual && !ocupado && (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-end gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            {sel > 0 && <button type="button" onClick={() => accion(() => fotoPrincipal(itemId, actual.id).then((r) => { setSel(0); return r; }))} className="rounded-full bg-cream/90 px-3 py-1.5 text-xs backdrop-blur hover:bg-cream">Poner como principal</button>}
            <button type="button" onClick={() => { sustituir.current = actual.id; input.current?.click(); }} className="rounded-full bg-cream/90 px-3 py-1.5 text-xs backdrop-blur hover:bg-cream">Sustituir</button>
            <button type="button" onClick={() => { if (confirm("¿Eliminar esta foto? No se puede deshacer.")) accion(() => borrarFoto(actual.id).then((r) => { setSel(0); return r; })); }}
              className="rounded-full bg-[#7a3b2e]/90 px-3 py-1.5 text-xs text-cream backdrop-blur hover:bg-[#7a3b2e]">Eliminar</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {fotos.map((f, k) => (
          <button key={f.id} type="button" onClick={() => setSel(k)} aria-label={`Foto ${k + 1}`}
            className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition ${k === sel ? "border-olive" : "border-transparent opacity-70 hover:opacity-100"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        {editable && (
          <button type="button" disabled={ocupado} onClick={() => { sustituir.current = undefined; input.current?.click(); }}
            className="grid h-16 min-w-16 place-items-center rounded-xl border border-dashed border-bronze/60 px-3 text-xs text-bronze transition hover:bg-bronze/10 disabled:opacity-50">
            {fotos.length ? "+ Fotos" : "+ Subir fotos"}
          </button>
        )}
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files)} />
      </div>
      {error && <p className="text-sm text-[#7a3b2e]">{error}</p>}
    </div>
  );
}
