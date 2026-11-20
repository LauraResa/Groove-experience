-- =====================================================================
-- INVENTARIO de material propio (fase 1) + reservas por evento (fase 2)
-- =====================================================================

create table inventario_categorias (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  nombre text not null,
  orden  int  not null default 0
);

create table inventario_items (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text unique,
  categoria_id        uuid references inventario_categorias on delete set null,
  nombre              text not null,
  descripcion         text,
  -- Cantidad: solo cuenta como stock si cantidad_confirmada = true
  cantidad            int check (cantidad is null or cantidad >= 0),
  cantidad_confirmada boolean not null default false,
  cantidad_min        int,               -- estimación (p. ej. 200–250)
  cantidad_max        int,
  unidad              text,
  ancho_cm            numeric,
  alto_cm             numeric,
  fondo_cm            numeric,
  medidas_nota        text,
  material            text,
  color               text,
  estado              text not null default 'por_revisar'
                      check (estado in ('por_revisar','bueno','desgaste','deteriorado','fuera_servicio')),
  unidades_deterioradas int not null default 0 check (unidades_deterioradas >= 0),
  ubicacion           text,
  disponibilidad      text check (disponibilidad in ('disponible','limitada','no_disponible')),
  pendiente           text,              -- qué falta confirmar (null = nada)
  observaciones       text,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  actualizado_por     uuid references perfiles on delete set null
);
create index on inventario_items (categoria_id);

create table inventario_fotos (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references inventario_items on delete cascade,
  storage_path text not null,
  orden        int  not null default 0,
  creado_en    timestamptz not null default now()
);
create index on inventario_fotos (item_id, orden);

-- Fase 2: selección de material por evento. Un borrador no descuenta stock;
-- solo las reservas 'confirmada' ocupan unidades en su rango de fechas.
create table inventario_reservas (
  id        uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos on delete set null,
  titulo    text not null,
  inicio    date not null,
  fin       date not null,
  estado    text not null default 'borrador' check (estado in ('borrador','confirmada','cancelada')),
  notas     text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fin >= inicio)
);

create table inventario_reserva_lineas (
  id         uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references inventario_reservas on delete cascade,
  item_id    uuid not null references inventario_items on delete restrict,
  cantidad   int  not null check (cantidad > 0),
  origen     text not null default 'propio' check (origen in ('propio','alquiler')),
  notas      text,
  unique (reserva_id, item_id, origen)
);

-- Unidades propias ocupadas por reservas confirmadas que se solapan con [p_inicio, p_fin]
create or replace function inventario_ocupado(p_item uuid, p_inicio date, p_fin date, p_excluir uuid default null)
returns int language sql stable set search_path = public, pg_temp as $$
  select coalesce(sum(l.cantidad), 0)::int
  from inventario_reserva_lineas l join inventario_reservas r on r.id = l.reserva_id
  where l.item_id = p_item and l.origen = 'propio' and r.estado = 'confirmada'
    and r.inicio <= p_fin and r.fin >= p_inicio
    and (p_excluir is null or r.id <> p_excluir);
$$;

-- actualizado_en / actualizado_por
create or replace function tocar_inventario() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.actualizado_en := now(); new.actualizado_por := auth.uid(); return new; end $$;
create trigger inventario_items_tocar before insert or update on inventario_items for each row execute function tocar_inventario();
create trigger inventario_reservas_tocar before update on inventario_reservas for each row execute function tocar_actualizado();

-- Una foto nueva cuenta como modificación del artículo
create or replace function tocar_item_por_foto() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin update inventario_items set actualizado_en = now() where id = coalesce(new.item_id, old.item_id); return null; end $$;
create trigger inventario_fotos_tocar after insert or delete on inventario_fotos for each row execute function tocar_item_por_foto();

-- RLS con la matriz de permisos (módulo 'inventario')
do $$
declare t text;
begin
  foreach t in array array['inventario_categorias','inventario_items','inventario_fotos','inventario_reservas','inventario_reserva_lineas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (tiene_permiso(''inventario'',''ver''))', t||'_sel', t);
    execute format('create policy %I on %I for insert to authenticated with check (tiene_permiso(''inventario'',''crear'') or tiene_permiso(''inventario'',''editar''))', t||'_ins', t);
    execute format('create policy %I on %I for update to authenticated using (tiene_permiso(''inventario'',''editar''))', t||'_upd', t);
    execute format('create policy %I on %I for delete to authenticated using (tiene_permiso(''inventario'',''borrar'') or (%L = ''inventario_fotos'' and tiene_permiso(''inventario'',''editar'')))', t||'_del', t, t);
  end loop;
end $$;

insert into permisos (rol_id, modulo, accion)
select r.id, 'inventario', a from roles r
cross join lateral unnest(case r.clave when 'admin_tge' then array['ver','crear','editar','borrar'] else array['ver'] end) a
where r.clave in ('admin_tge','direccion','comunicacion')
on conflict do nothing;

-- Storage: fotos del material (lectura pública por URL, escritura con permiso)
insert into storage.buckets (id, name, public) values ('inventario','inventario', true) on conflict (id) do nothing;
create policy inv_fotos_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'inventario' and tiene_permiso('inventario','editar'));
create policy inv_fotos_upd on storage.objects for update to authenticated
  using (bucket_id = 'inventario' and tiene_permiso('inventario','editar'));
create policy inv_fotos_del on storage.objects for delete to authenticated
  using (bucket_id = 'inventario' and tiene_permiso('inventario','editar'));

-- ---------------------------------------------------------------------
-- Datos iniciales (Inventario_Groove_actualizado.xlsx)
-- ---------------------------------------------------------------------
insert into inventario_categorias (slug, nombre, orden) values
  ('sillas','Sillas',1),('mesas','Mesas',2),('lounge','Sofás y zonas lounge',3),
  ('biombos','Biombos y separadores',4),('ocio','Ocio y entretenimiento',5),('decoracion','Decoración',6),
  ('iluminacion','Iluminación',7),('audiovisuales','Audiovisuales',8),('otros','Otros materiales',9);

insert into inventario_items (codigo, categoria_id, nombre, descripcion, cantidad, cantidad_confirmada, cantidad_min, cantidad_max, unidad, ancho_cm, alto_cm, fondo_cm, medidas_nota, disponibilidad, pendiente, observaciones)
select v.codigo, c.id, v.nombre, v.descr, v.cant, v.conf, v.cmin, v.cmax, v.unidad, v.an, v.al, v.fo, v.mnota, v.disp, v.pend, v.obs
from (values
  ('MOB-001','biombos','Biombos plegables','5 paneles por biombo (45 paneles en total). Admite distintas distribuciones.',9,true,null::int,null::int,'biombos',220::numeric,182::numeric,null::numeric,'Medidas aproximadas. Panel ~44 cm; anchura desplegada variable según apertura.','disponible',null,null),
  ('MOB-002','mesas','Mesas bajas negras cuadradas',null,26,true,null,null,'mesas',null,null,null,null,'disponible',null,null),
  ('MOB-003','lounge','Sofás blancos',null,36,true,null,null,'sofás',null,null,null,null,'disponible',null,null),
  ('MOB-004','mesas','Mesas altas Mahou',null,9,true,null,null,'mesas',null,null,null,null,'disponible',null,null),
  ('MOB-005','mesas','Mesas altas cuadradas',null,8,true,null,null,'mesas',null,null,null,null,'disponible',null,null),
  ('MOB-006','mesas','Mesas rectangulares',null,null,false,null,null,'mesas',200,null,90,null,null,'Cantidad',null),
  ('MOB-007','mesas','Mesas redondas',null,26,true,null,null,'mesas',null,null,null,null,'disponible',null,null),
  ('MOB-008','sillas','Sillas blancas de plástico apilables','Apilables. Para eventos, celebraciones y montajes de gran capacidad.',400,true,null,null,'sillas',null,null,null,null,'disponible',null,'Confirmadas por el equipo.'),
  ('MOB-009','sillas','Sillas de madera para bodas y eventos',null,null,false,200,250,'sillas',null,null,null,null,null,'Cantidad exacta','Posibilidad de ampliar unidades según el evento; cantidad adicional y condiciones pendientes de confirmar. No computa en el total confirmado.'),
  ('OCI-001','ocio','Canasta',null,1,true,null,null,'unidad',null,null,null,null,'disponible',null,null),
  ('OCI-002','ocio','Futbolín',null,1,true,null,null,'unidad',null,null,null,null,'disponible',null,null),
  ('OCI-003','ocio','Putch in ball',null,1,true,null,null,'unidad',null,null,null,null,'disponible','Nombre del juego','Nombre provisional.'),
  ('OCI-004','ocio','Dianas',null,2,true,null,null,'unidades',null,null,null,null,'disponible',null,null),
  ('VIS-001','iluminacion','Guirnaldas de luces',null,null,false,null,null,'unidades',null,null,null,null,null,'Propiedad y cantidad','Visto en fotografía; pendiente de inventariar.'),
  ('VIS-002','decoracion','Farolillos blancos colgantes',null,null,false,null,null,'unidades',null,null,null,null,null,'Propiedad y cantidad','Visto en fotografía; pendiente de inventariar.'),
  ('VIS-003','otros','Estructuras metálicas de cerramiento',null,null,false,null,null,'unidades',null,null,null,null,null,'Propiedad y cantidad','Visto en fotografía; confirmar propiedad y cantidad.'),
  ('VIS-004','otros','Mobiliario de palés negro',null,null,false,null,null,'unidades',null,null,null,null,null,'Propiedad y cantidad','Visto en fotografía; confirmar cantidad.'),
  ('VIS-005','otros','Plataforma / carro de transporte',null,null,false,null,null,'unidad',null,null,null,null,null,'Propiedad y cantidad','Una unidad vista en fotografía; pendiente de confirmar.')
) as v(codigo, cat, nombre, descr, cant, conf, cmin, cmax, unidad, an, al, fo, mnota, disp, pend, obs)
join inventario_categorias c on c.slug = v.cat;
