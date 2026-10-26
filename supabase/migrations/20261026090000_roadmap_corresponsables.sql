-- =====================================================================
-- Roadmap · responsabilidad compartida y participantes
-- SOLO AÑADE dos columnas a roadmap_items. No borra ni modifica datos.
--   corresponsable_id → segunda persona con la misma responsabilidad (usuario)
--   participantes     → usuarios que participan (p. ej. un hito conjunto)
-- responsable_id y colaborador_id quedan como están.
-- Los cambios siguen quedando en actividad_log (trigger roadmap_items_log).
-- =====================================================================
begin;

alter table roadmap_items
  add column if not exists corresponsable_id uuid references perfiles,
  add column if not exists participantes uuid[] not null default '{}';

-- La misma persona no puede ser responsable y corresponsable a la vez (las filas actuales lo cumplen: corresponsable vacío)
alter table roadmap_items drop constraint if exists roadmap_corresponsable_distinto;
alter table roadmap_items add constraint roadmap_corresponsable_distinto check (corresponsable_id is null or corresponsable_id <> responsable_id);

-- Un array no admite clave foránea: se valida que cada participante sea un usuario
-- y se quitan repetidos y vacíos.
create or replace function validar_participantes() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.participantes := array(select p from unnest(new.participantes) with ordinality u(p, o)
                             where p is not null group by p order by min(o));
  if exists (select 1 from unnest(new.participantes) p where not exists (select 1 from perfiles where id = p)) then
    raise exception 'Participante que no es usuario de la app';
  end if;
  return new;
end $$;

drop trigger if exists roadmap_participantes on roadmap_items;
create trigger roadmap_participantes before insert or update of participantes on roadmap_items
  for each row execute function validar_participantes();

commit;
