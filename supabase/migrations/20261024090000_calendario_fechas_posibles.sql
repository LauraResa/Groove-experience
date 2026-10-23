-- =====================================================================
-- Calendario: fechas "posibles" (sin confirmar) en bloques del calendario.
-- Necesario para la importación masiva de fechas.
-- No borra ni modifica ningún bloque existente (todos quedan como confirmados).
-- =====================================================================
begin;

alter table calendario_bloques add column provisional boolean not null default false;

-- Misma vista que antes; solo cambia el estilo de los bloques marcados como posibles
create or replace view calendario with (security_invoker = on) as
  select 'evento'::text as capa, e.id, e.nombre as titulo,
         coalesce(e.montaje_inicio, e.fecha::timestamptz) as inicio,
         coalesce(e.desmontaje_fin, e.fecha::timestamptz + interval '1 day') as fin,
         case when e.formato_id is not null then 'formato_propio' else 'evento_confirmado' end as estilo
  from eventos e where e.estado <> 'cancelado'
union all
  select 'propuesta', p.id, p.titulo, p.fecha_evento::timestamptz,
         p.fecha_evento::timestamptz + interval '1 day', 'provisional'
  from propuestas p
  where p.fecha_evento is not null and p.estado in ('enviada','negociacion','pendiente_aprobacion','aprobada')
union all
  select 'actividad', a.id, coalesce(a.descripcion, a.tipo::text), a.inicio,
         coalesce(a.fin, a.inicio + interval '1 hour'), 'reunion'
  from actividades a where a.tipo in ('reunion','visita') and a.inicio is not null
union all
  select 'bloque', b.id, b.titulo, b.inicio, b.fin,
         case when b.provisional then 'posible' else b.tipo::text end
  from calendario_bloques b
union all
  select 'roadmap', r.id, r.titulo, r.fecha_limite::timestamptz,
         r.fecha_limite::timestamptz + interval '1 day', 'hito'
  from roadmap_items r where r.fecha_limite is not null;

commit;
