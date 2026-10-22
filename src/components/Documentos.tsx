import { createClient } from "@/lib/supabase/server";
import { vincularDocumento } from "@/app/(app)/documentos/actions";
import { CARPETAS } from "@/lib/estados";
import { Ocultos, Tarjeta, Vacio, botonMini, campo } from "./ui";
import { Icono } from "@/app/(app)/Icono";

/** Documentos (enlaces) vinculados a una entidad */
export async function DocumentosDe({ tipo, id, volver, carpeta = "comercial" }: { tipo: string; id: string; volver: string; carpeta?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("documento_vinculos").select("documentos(id, nombre, carpeta, url_externa)").eq("entidad_tipo", tipo).eq("entidad_id", id);
  const docs = (data ?? []).map((d) => d.documentos as unknown as { id: string; nombre: string; carpeta: string; url_externa: string | null }).filter(Boolean);
  return (
    <Tarjeta titulo="Documentos">
      {docs.length ? (
        <ul className="mb-4 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <Icono n="documentos" className="h-4 w-4 text-bronze" />
              <a href={d.url_externa ?? "#"} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-olive">{d.nombre}</a>
              <span className="text-[11px] text-espresso/50">{CARPETAS[d.carpeta]}</span>
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin documentos.</Vacio>}
      <form action={vincularDocumento} className="space-y-2">
        <Ocultos v={{ entidad_tipo: tipo, entidad_id: id, _volver: volver, carpeta }} />
        <input name="nombre" required placeholder="Nombre (p. ej. Dossier 2026)" className={campo} />
        <div className="flex gap-2">
          <input name="url_externa" type="url" required placeholder="Enlace (Drive, Dropbox, Canva…)" className={campo} />
          <button className={botonMini}>Añadir</button>
        </div>
      </form>
    </Tarjeta>
  );
}

