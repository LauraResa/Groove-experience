-- =====================================================================
-- Fase 4 · Separar información económica de proveedores + conversión atómica
-- Todo en una transacción: si cualquier comprobación falla, no cambia nada.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Coste de cada proveedor de evento → tabla propia (solo con "Importes")
-- ---------------------------------------------------------------------
create table evento_proveedores_costes (
  evento_proveedor_id uuid primary key references evento_proveedores on delete cascade,
  coste               numeric(12,2)
);

insert into evento_proveedores_costes (evento_proveedor_id, coste)
select id, coste from evento_proveedores where coste is not null;

do $$
begin
  if (select count(*) from evento_proveedores where coste is not null)
     <> (select count(*) from evento_proveedores_costes) then
    raise exception 'Copia de costes incompleta: se cancela la migración';
  end if;
end $$;

alter table evento_proveedores drop column coste;

grant select, insert, update, delete on evento_proveedores_costes to authenticated;
alter table evento_proveedores_costes enable row level security;
create policy evprovcost_sel on evento_proveedores_costes for select to authenticated
  using (tiene_permiso('eventos', 'ver_importes'));
create policy evprovcost_all on evento_proveedores_costes for all to authenticated
  using (tiene_permiso('eventos', 'editar') and tiene_permiso('eventos', 'ver_importes'))
  with check (tiene_permiso('eventos', 'editar') and tiene_permiso('eventos', 'ver_importes'));

-- La parte operativa (proveedor, servicio, estado, valoración) la ve quien ve eventos
drop policy evprov_sel on evento_proveedores;
create policy evprov_sel on evento_proveedores for select to authenticated
  using (tiene_permiso('eventos', 'ver'));

-- ---------------------------------------------------------------------
-- 2. Condiciones / tarifas del proveedor → tabla propia (solo con "Importes")
-- ---------------------------------------------------------------------
create table proveedor_condiciones (
  proveedor_id uuid primary key references proveedores on delete cascade,
  condiciones  text
);

insert into proveedor_condiciones (proveedor_id, condiciones)
select id, condiciones from proveedores where condiciones is not null and condiciones <> '';

do $$
begin
  if (select count(*) from proveedores where condiciones is not null and condiciones <> '')
     <> (select count(*) from proveedor_condiciones) then
    raise exception 'Copia de condiciones incompleta: se cancela la migración';
  end if;
end $$;

alter table proveedores drop column condiciones;

grant select, insert, update, delete on proveedor_condiciones to authenticated;
alter table proveedor_condiciones enable row level security;
create policy provcond_sel on proveedor_condiciones for select to authenticated
  using (tiene_permiso('proveedores', 'ver_importes'));
create policy provcond_all on proveedor_condiciones for all to authenticated
  using (tiene_permiso('proveedores', 'editar') and tiene_permiso('proveedores', 'ver_importes'))
  with check (tiene_permiso('proveedores', 'editar') and tiene_permiso('proveedores', 'ver_importes'));

-- ---------------------------------------------------------------------
-- 3. Conversión Propuesta aceptada → Evento, atómica
--    SECURITY INVOKER: respeta los permisos (RLS) de quien la ejecuta.
--    Una función es una única transacción: o se crea todo o nada.
-- ---------------------------------------------------------------------
create or replace function convertir_propuesta_en_evento(p_propuesta uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_p       propuestas;
  v_lead    leads;
  v_evento  uuid;
  v_total   numeric;
  v_coste   numeric;
  v_ep      uuid;
  r         record;
begin
  -- bloquea la propuesta: dos conversiones simultáneas se ponen en cola
  select * into v_p from propuestas where id = p_propuesta for update;
  if not found then raise exception 'Propuesta no encontrada o sin permiso'; end if;
  if v_p.estado <> 'aceptada' then raise exception 'Solo se convierte en evento una propuesta aceptada'; end if;

  -- idempotente: si ya existe, devuelve el evento existente
  select id into v_evento from eventos where propuesta_id = p_propuesta;
  if found then return v_evento; end if;

  select * into v_lead from leads where id = v_p.lead_id;
  select total, coste into v_total, v_coste from propuesta_totales where propuesta_id = p_propuesta;

  insert into eventos (nombre, propuesta_id, lead_id, cliente_id, categoria_id, fecha, aforo, responsable_id, estado)
  values (v_p.titulo, p_propuesta, v_p.lead_id, v_lead.cliente_id, v_lead.categoria_id,
          coalesce(v_p.fecha_evento, (now() at time zone 'Europe/Madrid')::date), v_p.asistentes, v_p.responsable_id, 'preproduccion')
  returning id into v_evento;

  insert into evento_finanzas (evento_id, facturacion, costes)
  values (v_evento, coalesce(v_total, 0), coalesce(v_coste, 0));

  for r in select proveedor_id, descripcion, cantidad * coste_unitario as coste
           from propuesta_lineas where propuesta_id = p_propuesta and proveedor_id is not null order by orden, id
  loop
    insert into evento_proveedores (evento_id, proveedor_id, servicio) values (v_evento, r.proveedor_id, r.descripcion)
    returning id into v_ep;
    insert into evento_proveedores_costes (evento_proveedor_id, coste) values (v_ep, r.coste);
  end loop;

  insert into evento_espacios (evento_id, espacio_id)
  select v_evento, espacio_id from propuesta_espacios where propuesta_id = p_propuesta;

  insert into actividades (lead_id, tipo, descripcion)
  values (v_p.lead_id, 'cambio_estado', format('Convertida en evento · %s v%s', v_p.codigo, v_p.version));

  return v_evento;
end $$;

revoke execute on function convertir_propuesta_en_evento(uuid) from public, anon;
grant execute on function convertir_propuesta_en_evento(uuid) to authenticated;

commit;
