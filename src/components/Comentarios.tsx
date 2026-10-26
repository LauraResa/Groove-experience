import { createClient } from "@/lib/supabase/server";
import { comentar } from "@/lib/crud";
import { fFechaHora } from "@/lib/fechas";
import { Tarjeta, Vacio, campo, boton } from "./ui";

export async function Comentarios({ tipo, id, volver, titulo = "Comentarios del equipo", escribir = true }: { tipo: string; id: string; volver: string; titulo?: string; escribir?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("comentarios").select("id, texto, creado_en, perfiles(nombre)")
    .eq("entidad_tipo", tipo).eq("entidad_id", id).order("creado_en");
  return (
    <Tarjeta titulo={titulo}>
      {data?.length ? (
        <ul className="mb-4 space-y-2">
          {data.map((c) => (
            <li key={c.id} className="rounded-xl border border-stone/50 bg-cream/70 px-3 py-2 text-sm">
              <p className="text-[11px] text-espresso/50">{(c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "—"} · {fFechaHora(c.creado_en)}</p>
              <p className="whitespace-pre-line">{c.texto}</p>
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin comentarios.</Vacio>}
      {escribir && <form action={comentar} className="flex gap-2">
        <input type="hidden" name="entidad_tipo" value={tipo} />
        <input type="hidden" name="entidad_id" value={id} />
        <input type="hidden" name="_volver" value={volver} />
        <input name="texto" required placeholder="Escribe un comentario…" className={campo} />
        <button className={boton}>Enviar</button>
      </form>}
    </Tarjeta>
  );
}
