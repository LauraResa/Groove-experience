import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { guardar } from "@/lib/crud";
import { fFecha } from "@/lib/fechas";
import { EST_EVENTO } from "@/lib/estados";
import { Aviso, Cabecera, Campo, Insignia, Ocultos, Sel, Tarjeta, Vacio, boton, campo } from "@/components/ui";
import { Comentarios } from "@/components/Comentarios";
import { DocumentosDe } from "@/components/Documentos";
import { TareasDe } from "@/components/Tareas";

const TEXTOS: [string, string][] = [["publico", "Público"], ["objetivo", "Objetivo"], ["duracion", "Duración"], ["horario", "Horario"], ["necesidades", "Necesidades (montaje, limpieza, seguridad, decoración…)"], ["partners", "Partners"], ["sponsors", "Sponsors"], ["resultados", "Resultados y aprendizajes"]];

export default async function Formato({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = await getSesion();
  if (!puede(s, "formatos")) notFound();
  const editar = puede(s, "formatos", "editar");
  const importes = puede(s, "formatos", "ver_importes");
  const supabase = await createClient();
  const volver = `/formatos/${id}`;

  const { data: f } = await supabase.from("formatos").select("*, padre:formatos!formatos_padre_id_fkey(id, nombre)").eq("id", id).maybeSingle();
  if (!f) notFound();
  const [{ data: ediciones }, { data: variantes }, { data: categorias }, { data: otros }] = await Promise.all([
    supabase.from("eventos").select("id, nombre, fecha, estado, aforo").eq("formato_id", id).order("fecha", { ascending: false }),
    supabase.from("formatos").select("id, nombre").eq("padre_id", id),
    supabase.from("categorias").select("id, nombre").not("padre_id", "is", null).order("orden"),
    supabase.from("formatos").select("id, nombre").is("padre_id", null).neq("id", id),
  ]);
  const padre = f.padre as { id: string; nombre: string } | null;

  return (
    <div className="space-y-6 max-w-7xl">
      <Cabecera volver={{ href: "/formatos", txt: "Formatos propios" }} ante={padre ? `Variante de ${padre.nombre}` : "Formato propio"} titulo={f.nombre}
        sub={variantes?.length ? <>Variantes: {variantes.map((v, i) => <span key={v.id}>{i > 0 && ", "}<Link href={`/formatos/${v.id}`} className="text-olive hover:text-bronze">{v.nombre}</Link></span>)}</> : undefined} />
      <Aviso error={error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tarjeta titulo="Concepto">
            <form action={guardar} className="space-y-3">
              <Ocultos v={{ _tabla: "formatos", _id: id, _volver: volver }} />
              <fieldset disabled={!editar} className="space-y-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Campo t="Nombre"><input name="nombre" required defaultValue={f.nombre} className={campo} /></Campo>
                  <Campo t="Categoría"><Sel name="categoria_id" valor={f.categoria_id} ops={categorias ?? []} vacio="—" /></Campo>
                  <Campo t="Variante de"><Sel name="padre_id" valor={f.padre_id} ops={otros ?? []} vacio="—" /></Campo>
                  <Campo t="Aforo"><input name="aforo" type="number" defaultValue={f.aforo ?? ""} className={campo} /></Campo>
                  {importes && <Campo t="Coste estimado (€)"><input name="coste_estimado" type="number" step="0.01" defaultValue={f.coste_estimado ?? ""} className={campo} /></Campo>}
                  {importes && <Campo t="Ingreso potencial (€)"><input name="ingreso_potencial" type="number" step="0.01" defaultValue={f.ingreso_potencial ?? ""} className={campo} /></Campo>}
                </div>
                <Campo t="Descripción"><textarea name="descripcion" rows={4} defaultValue={f.descripcion ?? ""} className={campo} /></Campo>
                <div className="grid gap-3 md:grid-cols-2">
                  {TEXTOS.map(([k, t]) => <Campo key={k} t={t}><textarea name={k} rows={2} defaultValue={(f as Record<string, string | null>)[k] ?? ""} className={campo} /></Campo>)}
                </div>
                {editar && <button className={boton}>Guardar</button>}
              </fieldset>
            </form>
          </Tarjeta>
          <TareasDe tipo="formato" id={id} volver={volver} editar={puede(s, "tareas", "crear")} />
          <Comentarios tipo="formato" id={id} volver={volver} />
        </div>
        <div className="space-y-4">
          <Tarjeta titulo="Ediciones" accion={puede(s, "eventos", "crear") ? <Link href="/eventos" className="text-xs text-olive hover:text-bronze">+ Crear en Eventos</Link> : undefined}>
            {ediciones?.length ? (
              <ul className="space-y-2 text-sm">{ediciones.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <Link href={`/eventos/${e.id}`} className="truncate hover:text-olive">{fFecha(e.fecha, { day: "numeric", month: "short", year: "2-digit" })} · {e.nombre}</Link>
                  <Insignia tono={EST_EVENTO[e.estado]?.tono}>{EST_EVENTO[e.estado]?.t}</Insignia>
                </li>))}</ul>
            ) : <Vacio>Sin ediciones. Crea un evento y elige este formato.</Vacio>}
          </Tarjeta>
          <DocumentosDe tipo="formato" id={id} volver={volver} carpeta="formatos" />
        </div>
      </div>
    </div>
  );
}
