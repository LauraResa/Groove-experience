-- =====================================================================
-- THE GROOVE EXPERIENCE · Modelo de datos inicial
-- Postgres / Supabase.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type prioridad        as enum ('baja','media','alta','urgente');
create type tipo_cliente     as enum ('marca','empresa','agencia','particular','partner','comunidad');
create type canal_solicitud  as enum ('web','email','plataforma','comercial','manual');
create type estado_solicitud as enum ('nueva','asignada','convertida','descartada');
create type tipo_actividad   as enum ('llamada','email','reunion','visita','nota','whatsapp','cambio_estado');
create type estado_propuesta as enum ('borrador','pendiente_aprobacion','aprobada','enviada','negociacion','aceptada','rechazada','caducada');
create type bloque_linea     as enum ('espacio','catering','produccion','decoracion','tecnica','personal','extras','alojamiento');
create type estado_aprob     as enum ('pendiente','aprobada','rechazada');
create type estado_evento    as enum ('preproduccion','produccion','confirmado','en_ejecucion','finalizado','cancelado');
create type estado_tarea     as enum ('pendiente','en_curso','bloqueado','finalizado');
create type tipo_proveedor   as enum ('groove','propio');
create type tipo_bloque_cal  as enum ('sesion_groove','bloqueo','no_disponible','montaje','desmontaje','otro');
create type estado_contenido as enum ('necesidad','en_produccion','producido','publicado');
create type carpeta_doc      as enum ('comercial','dossiers','tarifas','contratos','proveedores','eventos','formatos','comunicacion','legal','plantillas');
create type entidad          as enum ('solicitud','lead','cliente','contacto','propuesta','evento','proveedor','formato','roadmap','tarea','documento','campana');

-- ---------------------------------------------------------------------
-- USUARIOS, ROLES, PERMISOS
-- ---------------------------------------------------------------------
create table roles (
  id          uuid primary key default gen_random_uuid(),
  clave       text unique not null,          -- admin_tge | direccion | comunicacion
  nombre      text not null,
  descripcion text
);

create table permisos (
  rol_id  uuid references roles on delete cascade,
  modulo  text not null,                     -- leads, propuestas, finanzas...
  accion  text not null,                     -- ver, crear, editar, borrar, aprobar, ver_importes, solo_propias
  primary key (rol_id, modulo, accion)
);

create table perfiles (
  id          uuid primary key references auth.users on delete cascade,
  nombre      text not null,
  email       text not null,
  avatar_url  text,
  rol_id      uuid references roles,         -- null = sin acceso
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create or replace function tiene_permiso(p_modulo text, p_accion text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from perfiles pf
    join permisos pm on pm.rol_id = pf.rol_id
    where pf.id = auth.uid() and pf.activo
      and pm.modulo = p_modulo and pm.accion = p_accion
  );
$$;

-- ---------------------------------------------------------------------
-- TAXONOMÍAS Y CONFIGURACIÓN
-- ---------------------------------------------------------------------
create table categorias (
  id        uuid primary key default gen_random_uuid(),
  padre_id  uuid references categorias,      -- null = categoría raíz
  nombre    text not null,
  orden     int not null default 0,
  activa    boolean not null default true
);

create table categorias_proveedor (
  id      uuid primary key default gen_random_uuid(),
  nombre  text unique not null,
  orden   int not null default 0
);

create table espacios (
  id      uuid primary key default gen_random_uuid(),
  nombre  text unique not null,              -- Sala principal, Groove Garden...
  aforo   int,
  notas   text
);

create table estados_lead (
  id         uuid primary key default gen_random_uuid(),
  nombre     text unique not null,
  orden      int not null,
  color      text,
  es_ganado  boolean not null default false,
  es_perdido boolean not null default false
);

create table condiciones_estandar (
  id      uuid primary key default gen_random_uuid(),
  regla   text unique not null,              -- descuento_max_pct, margen_min_pct, precio_min_pax, importe_max_sin_aprobar
  valor   numeric not null,
  ambito  uuid references categorias,        -- null = global
  activa  boolean not null default true
);

create table campanas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,                 -- Navidad Corporativa 2026
  fecha_ini   date,
  fecha_fin   date,
  objetivo    text,
  activa      boolean not null default true
);

-- ---------------------------------------------------------------------
-- COMERCIAL
-- ---------------------------------------------------------------------
create table clientes (
  id           uuid primary key default gen_random_uuid(),
  tipo         tipo_cliente not null,
  nombre       text not null,
  cif          text,
  web          text,
  sector       text,
  preferencias text,
  notas        text,
  creado_por   uuid references perfiles default auth.uid(),
  creado_en    timestamptz not null default now()
);
create index on clientes using gin (nombre extensions.gin_trgm_ops);

create table contactos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes on delete cascade,
  nombre      text not null,
  cargo       text,
  email       text,
  telefono    text,
  principal   boolean not null default false
);

create sequence lead_seq;
create table leads (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text unique not null default 'TGE-L-' || lpad(nextval('lead_seq')::text, 4, '0'),
  fecha_entrada         date not null default current_date,
  cliente_id            uuid references clientes,
  contacto_id           uuid references contactos,
  origen                text,                -- web, referido, instagram, plataforma X...
  categoria_id          uuid references categorias,
  campana_id            uuid references campanas,
  titulo                text not null,
  fecha_prevista        date,
  asistentes            int,
  presupuesto_estimado  numeric(12,2),
  responsable_id        uuid references perfiles,
  estado_id             uuid not null references estados_lead,
  prioridad             prioridad not null default 'media',
  proxima_accion        text,
  fecha_proxima_accion  date,
  motivo_perdida        text,
  notas                 text,
  creado_por            uuid references perfiles default auth.uid(),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create table lead_espacios (
  lead_id    uuid references leads on delete cascade,
  espacio_id uuid references espacios,
  primary key (lead_id, espacio_id)
);

create table solicitudes (
  id            uuid primary key default gen_random_uuid(),
  canal         canal_solicitud not null default 'manual',
  origen        text,
  remitente     text,
  email         text,
  telefono      text,
  asunto        text,
  cuerpo        text,
  payload_raw   jsonb,                       -- email/form crudo (futuro)
  recibida_por  uuid references perfiles default auth.uid(),
  asignada_a    uuid references perfiles,
  estado        estado_solicitud not null default 'nueva',
  lead_id       uuid references leads,
  recibida_en   timestamptz not null default now()
);

create table actividades (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads on delete cascade,
  cliente_id  uuid references clientes on delete cascade,
  tipo        tipo_actividad not null,
  inicio      timestamptz,                   -- reuniones/visitas → calendario
  fin         timestamptz,
  descripcion text,
  autor_id    uuid references perfiles default auth.uid(),
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PROVEEDORES Y CATÁLOGO
-- ---------------------------------------------------------------------
create table proveedores (
  id            uuid primary key default gen_random_uuid(),
  categoria_id  uuid references categorias_proveedor,
  empresa       text not null,
  contacto      text,
  telefono      text,
  email         text,
  web           text,
  servicios     text,
  condiciones   text,
  tipo          tipo_proveedor not null default 'propio',
  valoracion    smallint check (valoracion between 1 and 5),
  notas         text
);

create table catalogo_items (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid references proveedores,
  nombre        text not null,               -- Menú Navidad A (Inbodas)
  bloque        bloque_linea not null,
  unidad        text not null default 'pax', -- pax, unidad, hora, noche
  precio        numeric(12,2),               -- PVP estándar
  coste         numeric(12,2),
  condiciones   text,
  vigente_desde date,
  vigente_hasta date,
  activo        boolean not null default true
);

-- ---------------------------------------------------------------------
-- PROPUESTAS Y APROBACIONES
-- ---------------------------------------------------------------------
create sequence propuesta_seq;
create table propuestas (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text unique not null default 'TGE-P-' || lpad(nextval('propuesta_seq')::text, 4, '0'),
  lead_id             uuid not null references leads on delete cascade,
  version             int not null default 1,
  titulo              text not null,
  fecha_evento        date,
  asistentes          int,
  descuento_pct       numeric(5,2) not null default 0,
  condiciones         text,
  estado              estado_propuesta not null default 'borrador',
  fecha_envio         date,
  fecha_validez       date,
  responsable_id      uuid references perfiles,
  requiere_aprobacion boolean not null default false,  -- calculado por trigger
  motivos_aprobacion  text[] not null default '{}',
  creado_en           timestamptz not null default now(),
  unique (lead_id, version)
);
-- máximo una propuesta aceptada por lead
create unique index propuesta_aceptada_unica on propuestas (lead_id) where estado = 'aceptada';

create table propuesta_espacios (
  propuesta_id uuid references propuestas on delete cascade,
  espacio_id   uuid references espacios,
  primary key (propuesta_id, espacio_id)
);

create table propuesta_lineas (
  id               uuid primary key default gen_random_uuid(),
  propuesta_id     uuid not null references propuestas on delete cascade,
  bloque           bloque_linea not null,
  catalogo_item_id uuid references catalogo_items,
  proveedor_id     uuid references proveedores,
  descripcion      text not null,
  cantidad         numeric(10,2) not null default 1,
  precio_unitario  numeric(12,2) not null default 0,
  coste_unitario   numeric(12,2) not null default 0,
  orden            int not null default 0
);

create view propuesta_totales with (security_invoker = on) as
select p.id as propuesta_id,
       sum(l.cantidad * l.precio_unitario)                               as subtotal,
       sum(l.cantidad * l.precio_unitario) * (1 - p.descuento_pct / 100) as total,
       sum(l.cantidad * l.coste_unitario)                                as coste,
       sum(l.cantidad * l.precio_unitario) * (1 - p.descuento_pct / 100)
         - sum(l.cantidad * l.coste_unitario)                            as margen
from propuestas p
left join propuesta_lineas l on l.propuesta_id = p.id
group by p.id, p.descuento_pct;

create table aprobaciones (
  id              uuid primary key default gen_random_uuid(),
  entidad_tipo    entidad not null,
  entidad_id      uuid not null,
  motivo          text not null,
  detalle         text,
  solicitada_por  uuid references perfiles default auth.uid(),
  solicitada_en   timestamptz not null default now(),
  estado          estado_aprob not null default 'pendiente',
  decidida_por    uuid references perfiles,
  decidida_en     timestamptz,
  comentario      text
);
create index on aprobaciones (entidad_tipo, entidad_id);

-- ---------------------------------------------------------------------
-- FORMATOS PROPIOS
-- ---------------------------------------------------------------------
create table formatos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,           -- Social Club, Family Edition
  padre_id          uuid references formatos,-- Family Edition → Social Club
  categoria_id      uuid references categorias,
  descripcion       text,
  publico           text,
  objetivo          text,
  duracion          text,
  aforo             int,
  horario           text,
  necesidades       text,
  coste_estimado    numeric(12,2),
  ingreso_potencial numeric(12,2),
  partners          text,
  sponsors          text,
  resultados        text
);

-- ---------------------------------------------------------------------
-- EVENTOS
-- ---------------------------------------------------------------------
create sequence evento_seq;
create table eventos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text unique not null default 'TGE-E-' || lpad(nextval('evento_seq')::text, 4, '0'),
  nombre          text not null,
  propuesta_id    uuid unique references propuestas,
  lead_id         uuid references leads,
  cliente_id      uuid references clientes,
  formato_id      uuid references formatos,  -- edición de formato propio
  categoria_id    uuid references categorias,
  fecha           date not null,
  hora_inicio     time,
  hora_fin        time,
  montaje_inicio  timestamptz,
  desmontaje_fin  timestamptz,
  aforo           int,
  responsable_id  uuid references perfiles,
  estado          estado_evento not null default 'preproduccion',
  notas_internas  text,
  creado_en       timestamptz not null default now()
);

create table evento_espacios (
  evento_id  uuid references eventos on delete cascade,
  espacio_id uuid references espacios,
  primary key (evento_id, espacio_id)
);

create table evento_proveedores (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references eventos on delete cascade,
  proveedor_id uuid not null references proveedores,
  servicio     text,
  estado       text default 'pendiente',     -- pendiente, confirmado, pagado
  coste        numeric(12,2),
  valoracion   smallint check (valoracion between 1 and 5)
);

create table evento_timeline (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references eventos on delete cascade,
  momento        timestamptz not null,
  descripcion    text not null,
  responsable    text
);

create table incidencias (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos on delete cascade,
  descripcion text not null,
  gravedad    prioridad not null default 'media',
  resuelta    boolean not null default false,
  creado_por  uuid references perfiles default auth.uid(),
  creado_en   timestamptz not null default now()
);

create table contenidos (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid references eventos on delete cascade,
  formato_id     uuid references formatos on delete cascade,
  tipo           text not null,              -- foto, video, reel, post, prensa
  necesidad      text,
  estado         estado_contenido not null default 'necesidad',
  enlace         text,
  responsable_id uuid references perfiles,
  check (evento_id is not null or formato_id is not null)
);

-- ---------------------------------------------------------------------
-- FINANZAS (separado para controlar visibilidad de importes)
-- ---------------------------------------------------------------------
create table evento_finanzas (
  evento_id            uuid primary key references eventos on delete cascade,
  facturacion          numeric(12,2) not null default 0,
  costes               numeric(12,2) not null default 0,
  extras               numeric(12,2) not null default 0,
  reserva_groove       numeric(12,2) not null default 0,
  variable_pct         numeric(5,2)  not null default 0,
  variable_confirmado  numeric(12,2)
);

create table cobros (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references eventos on delete cascade,
  fecha      date not null,
  importe    numeric(12,2) not null,
  concepto   text,
  cobrado    boolean not null default false
);

-- Variable estimado: fórmula provisional, pendiente de decisión §13.3
create view evento_finanzas_resumen with (security_invoker = on) as
select f.*,
       coalesce((select sum(importe) from cobros c where c.evento_id = f.evento_id and c.cobrado), 0) as cobrado,
       f.facturacion + f.extras
         - coalesce((select sum(importe) from cobros c where c.evento_id = f.evento_id and c.cobrado), 0) as pendiente,
       (f.facturacion + f.extras - f.costes - f.reserva_groove) * f.variable_pct / 100 as variable_estimado
from evento_finanzas f;

-- ---------------------------------------------------------------------
-- CALENDARIO (solo lo que no tiene entidad propia)
-- ---------------------------------------------------------------------
create table calendario_bloques (
  id          uuid primary key default gen_random_uuid(),
  tipo        tipo_bloque_cal not null,
  titulo      text not null,
  inicio      timestamptz not null,
  fin         timestamptz not null,
  espacio_id  uuid references espacios,
  notas       text,
  check (fin >= inicio)
);

-- ---------------------------------------------------------------------
-- ROADMAP Y TAREAS
-- ---------------------------------------------------------------------
create table roadmap_items (
  id                 uuid primary key default gen_random_uuid(),
  semana             smallint check (semana between 1 and 52),
  area               text,                   -- comercial, operativa, comunicación, producto...
  objetivo           text,
  titulo             text not null,
  responsable_id     uuid references perfiles,
  colaborador_id     uuid references perfiles,
  depende_de_id      uuid references roadmap_items,
  fecha_inicio       date,
  fecha_limite       date,
  estado             estado_tarea not null default 'pendiente',
  prioridad          prioridad not null default 'media',
  resultado_esperado text,
  comentarios        text
);

create table tareas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  responsable_id uuid references perfiles,
  fecha          date,
  prioridad      prioridad not null default 'media',
  estado         estado_tarea not null default 'pendiente',
  notas          text,
  entidad_tipo   entidad,
  entidad_id     uuid,
  creado_por     uuid references perfiles default auth.uid(),
  creado_en      timestamptz not null default now()
);
create index on tareas (entidad_tipo, entidad_id);
create index on tareas (responsable_id, estado);

-- ---------------------------------------------------------------------
-- TRANSVERSAL: DOCUMENTOS, COMENTARIOS, ACTIVIDAD, NOTIFICACIONES
-- ---------------------------------------------------------------------
create table documentos (
  id            uuid primary key default gen_random_uuid(),
  carpeta       carpeta_doc not null,
  nombre        text not null,
  storage_path  text,                        -- Supabase Storage
  url_externa   text,                        -- Drive, Dropbox, vídeo...
  subido_por    uuid references perfiles default auth.uid(),
  subido_en     timestamptz not null default now(),
  check (storage_path is not null or url_externa is not null)
);

create table documento_vinculos (
  documento_id uuid references documentos on delete cascade,
  entidad_tipo entidad not null,
  entidad_id   uuid not null,
  primary key (documento_id, entidad_tipo, entidad_id)
);

create table comentarios (
  id           uuid primary key default gen_random_uuid(),
  entidad_tipo entidad not null,
  entidad_id   uuid not null,
  autor_id     uuid references perfiles default auth.uid(),
  texto        text not null,
  menciones    uuid[] not null default '{}',
  creado_en    timestamptz not null default now()
);
create index on comentarios (entidad_tipo, entidad_id);

create table actividad_log (
  id           bigint generated always as identity primary key,
  entidad_tipo entidad not null,
  entidad_id   uuid not null,
  accion       text not null,                -- crear, editar, estado, borrar
  cambios      jsonb,
  usuario_id   uuid default auth.uid(),
  creado_en    timestamptz not null default now()
);
create index on actividad_log (entidad_tipo, entidad_id, creado_en desc);

create table notificaciones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references perfiles on delete cascade,
  tipo         text not null,                -- aprobacion, mencion, asignacion
  entidad_tipo entidad,
  entidad_id   uuid,
  mensaje      text,
  leida        boolean not null default false,
  creado_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- VISTA CALENDARIO UNIFICADO
-- ---------------------------------------------------------------------
create view calendario with (security_invoker = on) as
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
  select 'bloque', b.id, b.titulo, b.inicio, b.fin, b.tipo::text
  from calendario_bloques b
union all
  select 'roadmap', r.id, r.titulo, r.fecha_limite::timestamptz,
         r.fecha_limite::timestamptz + interval '1 day', 'hito'
  from roadmap_items r where r.fecha_limite is not null;

-- ---------------------------------------------------------------------
-- REGLA DE APROBACIÓN (trigger sobre propuestas)
-- ---------------------------------------------------------------------
create or replace function calcular_aprobacion() returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_desc_max numeric; v_margen_min numeric; v_imp_max numeric;
  v_total numeric; v_coste numeric; v_motivos text[] := '{}';
begin
  select valor into v_desc_max   from condiciones_estandar where regla = 'descuento_max_pct'       and activa;
  select valor into v_margen_min from condiciones_estandar where regla = 'margen_min_pct'          and activa;
  select valor into v_imp_max    from condiciones_estandar where regla = 'importe_max_sin_aprobar' and activa;
  select total, coste into v_total, v_coste from propuesta_totales where propuesta_id = new.id;

  if v_desc_max is not null and new.descuento_pct > v_desc_max then
    v_motivos := array_append(v_motivos, 'Descuento superior al estándar'::text); end if;
  if v_margen_min is not null and coalesce(v_total,0) > 0
     and (v_total - v_coste) / v_total * 100 < v_margen_min then
    v_motivos := array_append(v_motivos, 'Margen inferior al mínimo'::text); end if;
  if v_imp_max is not null and coalesce(v_total,0) > v_imp_max then
    v_motivos := array_append(v_motivos, 'Importe superior al límite'::text); end if;
  if exists (select 1 from propuesta_lineas where propuesta_id = new.id and catalogo_item_id is null and proveedor_id is not null) then
    v_motivos := array_append(v_motivos, 'Proveedor o servicio fuera de catálogo'::text); end if;

  new.motivos_aprobacion  := v_motivos;
  new.requiere_aprobacion := cardinality(v_motivos) > 0;
  return new;
end $$;

create trigger propuestas_aprobacion before insert or update on propuestas
for each row execute function calcular_aprobacion();

create or replace function tocar_propuesta() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  update propuestas set id = id where id = coalesce(new.propuesta_id, old.propuesta_id);
  return null;
end $$;
create trigger propuesta_lineas_recalculo after insert or update or delete on propuesta_lineas
for each row execute function tocar_propuesta();

-- ---------------------------------------------------------------------
-- ALTA DE USUARIOS: email → rol (solo emails previstos obtienen acceso)
-- ---------------------------------------------------------------------
create table usuarios_previstos (
  email     text primary key,
  nombre    text not null,
  rol_clave text not null references roles (clave)
);

create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_prev usuarios_previstos;
begin
  select * into v_prev from usuarios_previstos where lower(email) = lower(new.email);
  insert into perfiles (id, nombre, email, rol_id)
  values (new.id, coalesce(v_prev.nombre, split_part(new.email, '@', 1)), new.email,
          (select id from roles where clave = v_prev.rol_clave))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function crear_perfil();

-- si el email se añade después de que el usuario haya entrado
create or replace function sincronizar_previsto() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update perfiles set nombre = new.nombre, rol_id = (select id from roles where clave = new.rol_clave)
  where lower(email) = lower(new.email);
  return new;
end $$;
create trigger usuarios_previstos_sync after insert or update on usuarios_previstos
for each row execute function sincronizar_previsto();

-- ---------------------------------------------------------------------
-- ACTIVITY LOG + actualizado_en
-- ---------------------------------------------------------------------
create or replace function registrar_actividad() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into actividad_log (entidad_tipo, entidad_id, accion, cambios)
  values (tg_argv[0]::entidad, coalesce(new.id, old.id), lower(tg_op),
          case when tg_op = 'UPDATE' then jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new))
               else to_jsonb(coalesce(new, old)) end);
  return null;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('solicitudes','solicitud'),('leads','lead'),('clientes','cliente'),('propuestas','propuesta'),
    ('eventos','evento'),('proveedores','proveedor'),('formatos','formato'),('roadmap_items','roadmap'),
    ('tareas','tarea')) t(tabla, ent)
  loop
    execute format('create trigger %I_log after insert or update or delete on %I
                    for each row execute function registrar_actividad(%L)', r.tabla, r.tabla, r.ent);
  end loop;
end $$;

create or replace function tocar_actualizado() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.actualizado_en := now(); return new; end $$;
create trigger leads_actualizado before update on leads for each row execute function tocar_actualizado();

-- ---------------------------------------------------------------------
-- RLS
-- Tablas de negocio: ver/crear/editar/borrar según permisos(rol, modulo, accion)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select * from (values
    ('clientes','clientes'),('contactos','clientes'),
    ('leads','leads'),('lead_espacios','leads'),('actividades','leads'),
    ('solicitudes','solicitudes'),
    ('proveedores','proveedores'),
    ('propuestas','propuestas'),('propuesta_espacios','propuestas'),('propuesta_lineas','propuestas'),
    ('formatos','formatos'),
    ('eventos','eventos'),('evento_espacios','eventos'),('evento_timeline','eventos'),('incidencias','eventos'),
    ('contenidos','contenidos'),
    ('evento_finanzas','finanzas'),('cobros','finanzas'),
    ('calendario_bloques','calendario'),
    ('roadmap_items','roadmap'),
    ('documentos','documentos'),('documento_vinculos','documentos'),
    ('campanas','leads')) t(tabla, modulo)
  loop
    execute format('alter table %I enable row level security', r.tabla);
    execute format('create policy %I on %I for select to authenticated using (tiene_permiso(%L,''ver''))', r.tabla||'_sel', r.tabla, r.modulo);
    execute format('create policy %I on %I for insert to authenticated with check (tiene_permiso(%L,''crear''))', r.tabla||'_ins', r.tabla, r.modulo);
    execute format('create policy %I on %I for update to authenticated using (tiene_permiso(%L,''editar''))', r.tabla||'_upd', r.tabla, r.modulo);
    execute format('create policy %I on %I for delete to authenticated using (tiene_permiso(%L,''borrar''))', r.tabla||'_del', r.tabla, r.modulo);
  end loop;
end $$;

-- Importes: catálogo y proveedores de evento solo con ver_importes
alter table catalogo_items enable row level security;
create policy catalogo_sel on catalogo_items for select to authenticated using (tiene_permiso('proveedores','ver_importes'));
create policy catalogo_all on catalogo_items for all    to authenticated using (tiene_permiso('proveedores','editar')) with check (tiene_permiso('proveedores','editar'));

alter table evento_proveedores enable row level security;
create policy evprov_sel on evento_proveedores for select to authenticated using (tiene_permiso('eventos','ver_importes'));
create policy evprov_all on evento_proveedores for all    to authenticated using (tiene_permiso('eventos','editar')) with check (tiene_permiso('eventos','editar'));

-- Configuración: lectura para cualquier usuario con rol, escritura solo admin
do $$
declare t text;
begin
  foreach t in array array['roles','permisos','categorias','categorias_proveedor','espacios','estados_lead','condiciones_estandar','usuarios_previstos']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (tiene_permiso(''inicio'',''ver''))', t||'_sel', t);
    execute format('create policy %I on %I for all to authenticated using (tiene_permiso(''configuracion'',''editar'')) with check (tiene_permiso(''configuracion'',''editar''))', t||'_adm', t);
  end loop;
end $$;

alter table perfiles enable row level security;
create policy perfiles_sel on perfiles for select to authenticated using (id = auth.uid() or tiene_permiso('inicio','ver'));
create policy perfiles_adm on perfiles for update to authenticated using (tiene_permiso('configuracion','editar'));

-- Aprobaciones
alter table aprobaciones enable row level security;
create policy aprob_sel on aprobaciones for select to authenticated using (tiene_permiso('aprobaciones','ver'));
create policy aprob_ins on aprobaciones for insert to authenticated with check (tiene_permiso('aprobaciones','crear'));
create policy aprob_upd on aprobaciones for update to authenticated using (tiene_permiso('aprobaciones','aprobar'));

-- Tareas: editar todo o solo propias
alter table tareas enable row level security;
create policy tareas_sel on tareas for select to authenticated using (tiene_permiso('tareas','ver'));
create policy tareas_ins on tareas for insert to authenticated with check (tiene_permiso('tareas','crear'));
create policy tareas_upd on tareas for update to authenticated using (
  tiene_permiso('tareas','editar')
  or (tiene_permiso('tareas','solo_propias') and (responsable_id = auth.uid() or creado_por = auth.uid())));
create policy tareas_del on tareas for delete to authenticated using (tiene_permiso('tareas','borrar'));

-- Comentarios: cualquier usuario con rol comenta; cada uno edita lo suyo
alter table comentarios enable row level security;
create policy com_sel on comentarios for select to authenticated using (tiene_permiso('inicio','ver'));
create policy com_ins on comentarios for insert to authenticated with check (tiene_permiso('inicio','ver') and autor_id = auth.uid());
create policy com_upd on comentarios for update to authenticated using (autor_id = auth.uid());
create policy com_del on comentarios for delete to authenticated using (autor_id = auth.uid());

-- Log: solo lectura (lo escriben triggers)
alter table actividad_log enable row level security;
create policy log_sel on actividad_log for select to authenticated using (tiene_permiso('inicio','ver'));

-- Notificaciones: cada uno las suyas
alter table notificaciones enable row level security;
create policy notif_sel on notificaciones for select to authenticated using (usuario_id = auth.uid());
create policy notif_upd on notificaciones for update to authenticated using (usuario_id = auth.uid());

revoke execute on function crear_perfil(), sincronizar_previsto(), registrar_actividad() from public, anon, authenticated;
-- ---------------------------------------------------------------------
-- SEMILLAS
-- ---------------------------------------------------------------------
insert into roles (clave, nombre) values
  ('admin_tge',    'Administradora · Responsable TGE'),
  ('direccion',    'Dirección · Supervisión Groove'),
  ('comunicacion', 'Comunicación · Contenido');

insert into estados_lead (nombre, orden, es_ganado, es_perdido) values
  ('Nuevo',1,false,false), ('Contactado',2,false,false), ('Reunión',3,false,false),
  ('Visita',4,false,false), ('Propuesta en preparación',5,false,false),
  ('Propuesta enviada',6,false,false), ('Negociación',7,false,false),
  ('Pendiente aprobación Groove',8,false,false), ('Confirmado',9,true,false),
  ('Perdido',10,false,true), ('Cancelado',11,false,true);

insert into categorias_proveedor (nombre, orden) values
  ('Catering',1),('DJ',2),('Sonido',3),('Iluminación',4),('Mobiliario',5),('Decoración',6),
  ('Fotografía',7),('Vídeo',8),('Seguridad',9),('Personal',10),('Actividades',11),
  ('Entretenimiento',12),('Wellness',13),('Transporte',14),('Hoteles',15),('Producción',16);

insert into espacios (nombre) values ('Sala principal'), ('Groove Garden');

insert into campanas (nombre, fecha_ini, fecha_fin, objetivo) values
  ('Navidad Corporativa 2026', '2026-11-15', '2027-01-10', 'Comidas y cenas de empresa');

with r as (insert into categorias (nombre, orden) values
  ('Events & Brands',1), ('Sport & Wellness',2), ('Social & Culture',3) returning id, nombre)
insert into categorias (padre_id, nombre, orden)
select r.id, s.nombre, s.ord from r join (values
  ('Events & Brands','Corporate',1),('Events & Brands','Lanzamientos',2),('Events & Brands','Eventos de marca',3),
  ('Events & Brands','Creator events',4),('Events & Brands','Beauty',5),('Events & Brands','Fashion',6),
  ('Events & Brands','Presentaciones',7),('Events & Brands','Activaciones',8),
  ('Sport & Wellness','Fitness',1),('Sport & Wellness','Training',2),('Sport & Wellness','Cycling',3),
  ('Sport & Wellness','Boxing',4),('Sport & Wellness','Yoga',5),('Sport & Wellness','Pilates',6),
  ('Sport & Wellness','Wellness',7),('Sport & Wellness','Experiencias deportivas',8),('Sport & Wellness','Patrocinios',9),
  ('Social & Culture','Social Club',1),('Social & Culture','Brunch / Daytime',2),('Social & Culture','Family Edition',3),
  ('Social & Culture','Talks',4),('Social & Culture','Música',5),('Social & Culture','Encuentros',6),
  ('Social & Culture','Formatos propios recurrentes',7)
) as s(padre, nombre, ord) on s.padre = r.nombre;

insert into formatos (nombre, descripcion) values
  ('Social Club', 'Formato recurrente de día: comunidad, música, gastronomía, actividades, marcas, networking, lifestyle.');
insert into formatos (nombre, padre_id, descripcion)
  select 'Family Edition Navidad', id, 'Experiencia familiar de día: ciudad navideña, Papá Noel / Reyes, talleres, brunch.'
  from formatos where nombre = 'Social Club';

-- ---------------------------------------------------------------------
-- MATRIZ DE PERMISOS (docs/01-arquitectura.md §6.2)
-- ---------------------------------------------------------------------
insert into permisos (rol_id, modulo, accion)
select r.id, m.modulo, m.accion
from roles r
join (values
  -- admin_tge: todo
  ('admin_tge','inicio','ver'),('admin_tge','inicio','ver_importes'),
  ('admin_tge','solicitudes','ver'),('admin_tge','solicitudes','crear'),('admin_tge','solicitudes','editar'),('admin_tge','solicitudes','borrar'),
  ('admin_tge','leads','ver'),('admin_tge','leads','crear'),('admin_tge','leads','editar'),('admin_tge','leads','borrar'),('admin_tge','leads','ver_importes'),
  ('admin_tge','propuestas','ver'),('admin_tge','propuestas','crear'),('admin_tge','propuestas','editar'),('admin_tge','propuestas','borrar'),('admin_tge','propuestas','ver_importes'),
  ('admin_tge','aprobaciones','ver'),('admin_tge','aprobaciones','crear'),
  ('admin_tge','eventos','ver'),('admin_tge','eventos','crear'),('admin_tge','eventos','editar'),('admin_tge','eventos','borrar'),('admin_tge','eventos','ver_importes'),
  ('admin_tge','contenidos','ver'),('admin_tge','contenidos','crear'),('admin_tge','contenidos','editar'),('admin_tge','contenidos','borrar'),
  ('admin_tge','clientes','ver'),('admin_tge','clientes','crear'),('admin_tge','clientes','editar'),('admin_tge','clientes','borrar'),('admin_tge','clientes','ver_importes'),
  ('admin_tge','proveedores','ver'),('admin_tge','proveedores','crear'),('admin_tge','proveedores','editar'),('admin_tge','proveedores','borrar'),('admin_tge','proveedores','ver_importes'),
  ('admin_tge','formatos','ver'),('admin_tge','formatos','crear'),('admin_tge','formatos','editar'),('admin_tge','formatos','borrar'),('admin_tge','formatos','ver_importes'),
  ('admin_tge','calendario','ver'),('admin_tge','calendario','crear'),('admin_tge','calendario','editar'),('admin_tge','calendario','borrar'),
  ('admin_tge','roadmap','ver'),('admin_tge','roadmap','crear'),('admin_tge','roadmap','editar'),('admin_tge','roadmap','borrar'),
  ('admin_tge','tareas','ver'),('admin_tge','tareas','crear'),('admin_tge','tareas','editar'),('admin_tge','tareas','borrar'),
  ('admin_tge','documentos','ver'),('admin_tge','documentos','crear'),('admin_tge','documentos','editar'),('admin_tge','documentos','borrar'),
  ('admin_tge','finanzas','ver'),('admin_tge','finanzas','crear'),('admin_tge','finanzas','editar'),('admin_tge','finanzas','ver_importes'),
  ('admin_tge','reporting','ver'),
  ('admin_tge','configuracion','ver'),('admin_tge','configuracion','editar'),
  -- direccion: ve todo, comenta, aprueba
  ('direccion','inicio','ver'),('direccion','inicio','ver_importes'),
  ('direccion','solicitudes','ver'),('direccion','solicitudes','crear'),
  ('direccion','leads','ver'),('direccion','leads','ver_importes'),
  ('direccion','propuestas','ver'),('direccion','propuestas','ver_importes'),
  ('direccion','aprobaciones','ver'),('direccion','aprobaciones','aprobar'),
  ('direccion','eventos','ver'),('direccion','eventos','ver_importes'),
  ('direccion','contenidos','ver'),
  ('direccion','clientes','ver'),('direccion','clientes','ver_importes'),
  ('direccion','proveedores','ver'),('direccion','proveedores','ver_importes'),
  ('direccion','formatos','ver'),('direccion','formatos','ver_importes'),
  ('direccion','calendario','ver'),('direccion','roadmap','ver'),
  ('direccion','tareas','ver'),('direccion','tareas','crear'),('direccion','tareas','solo_propias'),
  ('direccion','documentos','ver'),
  ('direccion','finanzas','ver'),('direccion','finanzas','ver_importes'),
  ('direccion','reporting','ver'),
  -- comunicacion: eventos, calendario, formatos, contenidos, documentos; sin importes
  ('comunicacion','inicio','ver'),
  ('comunicacion','solicitudes','ver'),('comunicacion','solicitudes','crear'),
  ('comunicacion','eventos','ver'),
  ('comunicacion','contenidos','ver'),('comunicacion','contenidos','crear'),('comunicacion','contenidos','editar'),
  ('comunicacion','proveedores','ver'),
  ('comunicacion','formatos','ver'),
  ('comunicacion','calendario','ver'),('comunicacion','roadmap','ver'),
  ('comunicacion','tareas','ver'),('comunicacion','tareas','crear'),('comunicacion','tareas','solo_propias'),
  ('comunicacion','documentos','ver'),('comunicacion','documentos','crear'),('comunicacion','documentos','editar')
) as m(rol, modulo, accion) on m.rol = r.clave;

insert into condiciones_estandar (regla, valor) values
  ('descuento_max_pct', 10),   -- PROVISIONAL, ajustar en Configuración
  ('margen_min_pct', 30);      -- PROVISIONAL
