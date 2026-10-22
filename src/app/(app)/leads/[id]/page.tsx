import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSesion, puede } from "@/lib/sesion";
import { Icono } from "../../Icono";
import { actualizarLead, anadirActividad, comentar } from "../actions";
import { crearPropuesta } from "../../propuestas/actions";
import { Espacios } from "@/components/Espacios";
import { TareasDe } from "@/components/Tareas";

const campo = "w-full rounded-lg border border-stone bg-cream/80 px-3 py-2 text-sm outline-none focus:border-olive disabled:bg-transparent disabled:border-transparent disabled:px-0";
const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt = (d: string) => new Date(d).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

const TIPOS: Record<string, string> = { llamada: "Llamada", email: "Email", reunion: "Reunión", visita: "Visita", nota: "Nota", whatsapp: "WhatsApp", cambio_estado: "Cambio de estado" };
const EST_PROP: Record<string, string> = { borrador: "Borrador", pendiente_aprobacion: "Pendiente aprobación", aprobada: "Aprobada", enviada: "Enviada", negociacion: "Negociación", aceptada: "Aceptada", rechazada: "Rechazada", caducada: "Caducada" };

export default async function FichaLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSesion();
  if (!puede(s, "leads")) notFound();
  const editar = puede(s, "leads", "editar");
  const importes = puede(s, "leads", "ver_importes");
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads")
    .select("*, clientes(id, nombre, tipo), contactos(nombre, cargo, email, telefono)")
    .eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [{ data: estados }, { data: categorias }, { data: campanas }, { data: perfiles }, { data: actividades }, { data: comentarios }, { data: propuestas }] = await Promise.all([
    supabase.from("estados_lead").select("id, nombre, es_perdido").order("orden"),
    supabase.from("categorias").select("id, nombre, padre_id").not("padre_id", "is", null).eq("activa", true).order("orden"),
    supabase.from("campanas").select("id, nombre"),
    supabase.from("perfiles").select("id, nombre, roles(clave)"),
    supabase.from("actividades").select("id, tipo, inicio, descripcion, creado_en, perfiles(nombre)").eq("lead_id", id).order("creado_en", { ascending: false }),
    supabase.from("comentarios").select("id, texto, creado_en, perfiles(nombre)").eq("entidad_tipo", "lead").eq("entidad_id", id).order("creado_en"),
    supabase.from("propuestas").select("id, codigo, version, titulo, estado, requiere_aprobacion").eq("lead_id", id).order("version"),
  ]);

  const cliente = lead.clientes as { id: string; nombre: string; tipo: string } | null;
  const contacto = lead.contactos as { nombre: string; cargo: string | null; email: string | null; telefono: string | null } | null;
  const estado = (estados ?? []).find((e) => e.id === lead.estado_id);
  const responsables = (perfiles ?? []).filter((p) => (p.roles as unknown as { clave: string } | null)?.clave === "admin_tge");
  const nombre = (x: unknown) => (x as { nombre: string } | null)?.nombre ?? "—";

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="aparecer space-y-3">
        <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-olive hover:text-bronze">← Leads</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="antetitulo">{lead.codigo}</p>
            <h1 className="font-serif text-3xl md:text-4xl mt-1">{lead.titulo}</h1>
            <p className="text-sm text-espresso/60 mt-1">{cliente?.nombre ?? "Sin cliente"} · entrada {new Date(lead.fecha_entrada).toLocaleDateString("es-ES")}</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="rounded-full bg-olive/15 px-3 py-1 text-xs text-olive-deep">{estado?.nombre}</span>
            {importes && lead.presupuesto_estimado && <span className="font-serif text-2xl text-bronze">{eur(Number(lead.presupuesto_estimado))}</span>}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <form action={actualizarLead} className="tarjeta aparecer lg:col-span-2 p-5 md:p-6">
          <input type="hidden" name="id" value={lead.id} />
          <fieldset disabled={!editar} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg">Datos del lead</h2>
              {editar && <button className="rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep">Guardar cambios</button>}
            </div>
            <L t="Título"><input name="titulo" required defaultValue={lead.titulo} className={campo} /></L>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <L t="Estado"><Sel name="estado_id" valor={lead.estado_id} ops={estados ?? []} /></L>
              <L t="Prioridad"><Sel name="prioridad" valor={lead.prioridad} ops={["baja", "media", "alta", "urgente"].map((p) => ({ id: p, nombre: p }))} /></L>
              <L t="Responsable"><Sel name="responsable_id" valor={lead.responsable_id} ops={responsables} vacio /></L>
              <L t="Categoría"><Sel name="categoria_id" valor={lead.categoria_id} ops={categorias ?? []} vacio /></L>
              <L t="Campaña"><Sel name="campana_id" valor={lead.campana_id} ops={campanas ?? []} vacio /></L>
              <L t="Origen"><input name="origen" defaultValue={lead.origen ?? ""} className={campo} /></L>
              <L t="Fecha prevista"><input name="fecha_prevista" type="date" defaultValue={lead.fecha_prevista ?? ""} className={campo} /></L>
              <L t="Asistentes"><input name="asistentes" type="number" min="0" defaultValue={lead.asistentes ?? ""} className={campo} /></L>
              {importes && <L t="Presupuesto estimado (€)"><input name="presupuesto" type="number" min="0" step="0.01" defaultValue={lead.presupuesto_estimado ?? ""} className={campo} /></L>}
            </div>
            <div className="grid md:grid-cols-[1fr_12rem] gap-3">
              <L t="Próxima acción"><input name="proxima_accion" defaultValue={lead.proxima_accion ?? ""} className={campo} /></L>
              <L t="Fecha próxima acción"><input name="fecha_proxima_accion" type="date" defaultValue={lead.fecha_proxima_accion ?? ""} className={campo} /></L>
            </div>
            {(estado?.es_perdido || lead.motivo_perdida) && (
              <L t="Motivo de pérdida / cancelación"><input name="motivo_perdida" defaultValue={lead.motivo_perdida ?? ""} className={campo} /></L>
            )}
            <L t="Notas"><textarea name="notas" rows={4} defaultValue={lead.notas ?? ""} className={campo} /></L>
          </fieldset>
        </form>

        <div className="space-y-4">
          <div className="tarjeta aparecer p-5">
            <h2 className="font-serif text-lg mb-3">Contacto</h2>
            {contacto ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{contacto.nombre}{contacto.cargo && <span className="text-espresso/55"> · {contacto.cargo}</span>}</p>
                {contacto.email && <a href={`mailto:${contacto.email}`} className="block text-olive hover:text-bronze">{contacto.email}</a>}
                {contacto.telefono && <a href={`tel:${contacto.telefono}`} className="block text-olive hover:text-bronze">{contacto.telefono}</a>}
              </div>
            ) : <p className="text-sm text-espresso/50">Sin contacto</p>}
            {cliente && <p className="mt-3 pt-3 border-t border-stone/50 text-xs text-espresso/60">Cliente: <Link href={`/clientes/${cliente.id}`} className="text-olive hover:text-bronze">{cliente.nombre}</Link> · {cliente.tipo}</p>}
            <div className="mt-3 pt-3 border-t border-stone/50">
              <p className="mb-2 text-xs text-espresso/60">Espacios de interés</p>
              <Espacios tabla="lead_espacios" col="lead_id" id={lead.id} volver={`/leads/${lead.id}`} editar={editar} />
            </div>
          </div>

          <div className="tarjeta aparecer p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg">Propuestas</h2>
              {puede(s, "propuestas", "crear") && (
                <form action={crearPropuesta}><input type="hidden" name="lead_id" value={lead.id} />
                  <button className="rounded-md bg-olive px-2.5 py-1 text-xs text-cream hover:bg-olive-deep">+ Nueva</button></form>
              )}
            </div>
            {propuestas?.length ? (
              <ul className="space-y-2 text-sm">
                {propuestas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/propuestas/${p.id}`} className="truncate hover:text-olive">{p.codigo} · v{p.version}</Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${p.requiere_aprobacion ? "bg-bronze/20 text-bronze" : "bg-olive/15 text-olive-deep"}`}>{EST_PROP[p.estado] ?? p.estado}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-espresso/50">Todavía no hay propuestas.</p>}
          </div>
        </div>
      </div>

      <TareasDe tipo="lead" id={lead.id} volver={`/leads/${lead.id}`} editar={puede(s, "tareas", "crear")} />

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="tarjeta aparecer p-5 md:p-6">
          <h2 className="font-serif text-lg mb-3">Actividad</h2>
          {editar && (
            <form action={anadirActividad} className="grid grid-cols-2 md:grid-cols-[8rem_1fr] gap-2 mb-4 pb-4 border-b border-stone/50">
              <input type="hidden" name="lead_id" value={lead.id} />
              <select name="tipo" className={campo}>
                {["llamada", "email", "whatsapp", "reunion", "visita", "nota"].map((t) => <option key={t} value={t}>{TIPOS[t]}</option>)}
              </select>
              <input name="inicio" type="datetime-local" className={campo} title="Fecha (reuniones y visitas salen en el calendario)" />
              <textarea name="descripcion" rows={2} required placeholder="¿Qué ha pasado?" className={`${campo} col-span-2`} />
              <button className="col-span-2 md:col-span-1 md:col-start-2 justify-self-end rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep">Registrar</button>
            </form>
          )}
          {actividades?.length ? (
            <ol className="space-y-3">
              {actividades.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-bronze" />
                  <div className="text-sm">
                    <p><span className="font-medium">{TIPOS[a.tipo] ?? a.tipo}</span>{a.inicio && <span className="text-espresso/60"> · {fmt(a.inicio)}</span>}</p>
                    {a.descripcion && <p className="text-espresso/80 whitespace-pre-line">{a.descripcion}</p>}
                    <p className="text-[11px] text-espresso/45">{nombre(a.perfiles)} · {fmt(a.creado_en)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-espresso/50">Sin actividad registrada.</p>}
        </section>

        <section className="tarjeta aparecer p-5 md:p-6">
          <h2 className="font-serif text-lg mb-3 flex items-center gap-2"><Icono n="clientes" className="h-4 w-4 text-bronze" />Comentarios del equipo</h2>
          {comentarios?.length ? (
            <ul className="space-y-3 mb-4">
              {comentarios.map((c) => (
                <li key={c.id} className="rounded-xl bg-cream/70 border border-stone/50 px-3 py-2 text-sm">
                  <p className="text-[11px] text-espresso/50">{nombre(c.perfiles)} · {fmt(c.creado_en)}</p>
                  <p className="whitespace-pre-line">{c.texto}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-espresso/50 mb-4">Sin comentarios.</p>}
          <form action={comentar} className="flex gap-2">
            <input type="hidden" name="entidad_tipo" value="lead" />
            <input type="hidden" name="entidad_id" value={lead.id} />
            <input name="texto" required placeholder="Escribe un comentario…" className={campo} />
            <button className="rounded-lg bg-olive px-4 py-2 text-sm text-cream hover:bg-olive-deep">Enviar</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs text-espresso/60">{t}</span>{children}</label>;
}

function Sel({ name, valor, ops, vacio }: { name: string; valor: string | null; ops: { id: string; nombre: string }[]; vacio?: boolean }) {
  return (
    <select name={name} defaultValue={valor ?? ""} className={campo}>
      {vacio && <option value="">—</option>}
      {ops.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
    </select>
  );
}
