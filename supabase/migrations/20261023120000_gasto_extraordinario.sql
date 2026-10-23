-- =====================================================================
-- Reglas comerciales: "Importe máximo sin aprobación" → "Gasto/inversión
-- extraordinaria máxima sin aprobación".
-- Un evento grande ya no pide aprobación por ser grande; solo las excepciones.
-- No borra datos de propuestas ni de líneas.
-- =====================================================================
begin;

-- 1. Marca por línea: ¿es un gasto/inversión extraordinaria? (por defecto, no)
alter table propuesta_lineas add column extraordinario boolean not null default false;

-- 2. Se retira la regla de importe máximo (si alguien la hubiera rellenado)
delete from condiciones_estandar where regla = 'importe_max_sin_aprobar';

-- 3. Cálculo de "requiere aprobación": sin importe máximo, con gasto extraordinario
create or replace function calcular_aprobacion() returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_desc_max numeric; v_margen_min numeric; v_gasto_max numeric;
  v_total numeric; v_coste numeric; v_gasto numeric; v_motivos text[] := '{}';
begin
  select valor into v_desc_max   from condiciones_estandar where regla = 'descuento_max_pct'           and activa;
  select valor into v_margen_min from condiciones_estandar where regla = 'margen_min_pct'              and activa;
  select valor into v_gasto_max  from condiciones_estandar where regla = 'gasto_extraordinario_max'    and activa;
  select total, coste into v_total, v_coste from propuesta_totales where propuesta_id = new.id;
  select coalesce(sum(cantidad * coste_unitario), 0) into v_gasto
    from propuesta_lineas where propuesta_id = new.id and extraordinario;

  if v_desc_max is not null and new.descuento_pct > v_desc_max then
    v_motivos := array_append(v_motivos, 'Descuento superior al permitido'::text); end if;
  if v_margen_min is not null and coalesce(v_total,0) > 0
     and (v_total - v_coste) / v_total * 100 < v_margen_min then
    v_motivos := array_append(v_motivos, 'Margen inferior al mínimo'::text); end if;
  if v_gasto_max is not null and v_gasto > v_gasto_max then
    v_motivos := array_append(v_motivos, 'Gasto/inversión extraordinaria superior al máximo'::text); end if;
  if exists (select 1 from propuesta_lineas where propuesta_id = new.id and catalogo_item_id is null and proveedor_id is not null) then
    v_motivos := array_append(v_motivos, 'Proveedor o servicio fuera de catálogo'::text); end if;

  new.motivos_aprobacion  := v_motivos;
  new.requiere_aprobacion := cardinality(v_motivos) > 0;
  return new;
end $$;

-- 4. Recalcular solo las propuestas abiertas (las cerradas no se tocan)
update propuestas set id = id
where estado in ('borrador', 'pendiente_aprobacion', 'aprobada', 'enviada', 'negociacion');

commit;
