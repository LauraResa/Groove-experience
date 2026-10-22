-- =====================================================================
-- THE GROOVE EXPERIENCE · Modelo de datos (BORRADOR FASE 1)
-- Postgres / Supabase. NO aplicado todavía.
-- Tras aprobación se moverá a supabase/migrations/.
-- =====================================================================

create extension if not exists pg_trgm;

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
  rol_id      uuid not null references roles,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create or replace function tiene_permiso(p_modulo text, p_accion text)
returns boolean language sql stable security definer set search_path = public as $$
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
create index on clientes using gin (nombre gin_trgm_ops);

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

create view propuesta_totales as
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
create view evento_finanzas_resumen as
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
create view calendario as
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
create or replace function calcular_aprobacion() returns trigger language plpgsql as $$
declare
  v_desc_max numeric; v_margen_min numeric; v_imp_max numeric;
  v_total numeric; v_coste numeric; v_motivos text[] := '{}';
begin
  select valor into v_desc_max   from condiciones_estandar where regla = 'descuento_max_pct'       and activa;
  select valor into v_margen_min from condiciones_estandar where regla = 'margen_min_pct'          and activa;
  select valor into v_imp_max    from condiciones_estandar where regla = 'importe_max_sin_aprobar' and activa;
  select total, coste into v_total, v_coste from propuesta_totales where propuesta_id = new.id;

  if v_desc_max is not null and new.descuento_pct > v_desc_max then
    v_motivos := v_motivos || 'Descuento superior al estándar'; end if;
  if v_margen_min is not null and coalesce(v_total,0) > 0
     and (v_total - v_coste) / v_total * 100 < v_margen_min then
    v_motivos := v_motivos || 'Margen inferior al mínimo'; end if;
  if v_imp_max is not null and coalesce(v_total,0) > v_imp_max then
    v_motivos := v_motivos || 'Importe superior al límite'; end if;
  if exists (select 1 from propuesta_lineas where propuesta_id = new.id and catalogo_item_id is null and proveedor_id is not null) then
    v_motivos := v_motivos || 'Proveedor o servicio fuera de catálogo'; end if;

  new.motivos_aprobacion  := v_motivos;
  new.requiere_aprobacion := cardinality(v_motivos) > 0;
  return new;
end $$;

create trigger propuestas_aprobacion before insert or update on propuestas
for each row execute function calcular_aprobacion();
-- (fase 2: trigger en propuesta_lineas que haga touch de la propuesta padre)

-- ---------------------------------------------------------------------
-- RLS (patrón; se replica por tabla en la migración real)
-- ---------------------------------------------------------------------
alter table leads enable row level security;
create policy leads_select on leads for select using (tiene_permiso('leads','ver'));
create policy leads_insert on leads for insert with check (tiene_permiso('leads','crear'));
create policy leads_update on leads for update using (tiene_permiso('leads','editar'));
create policy leads_delete on leads for delete using (tiene_permiso('leads','borrar'));

alter table evento_finanzas enable row level security;
create policy fin_select on evento_finanzas for select using (tiene_permiso('finanzas','ver_importes'));
create policy fin_write  on evento_finanzas for all    using (tiene_permiso('finanzas','editar'));

alter table aprobaciones enable row level security;
create policy aprob_select on aprobaciones for select using (tiene_permiso('aprobaciones','ver'));
create policy aprob_insert on aprobaciones for insert with check (tiene_permiso('aprobaciones','crear'));
create policy aprob_decide on aprobaciones for update using (tiene_permiso('aprobaciones','aprobar'));

alter table tareas enable row level security;
create policy tareas_select on tareas for select using (tiene_permiso('tareas','ver'));
create policy tareas_write  on tareas for all using (
  tiene_permiso('tareas','editar')
  or (tiene_permiso('tareas','solo_propias') and (responsable_id = auth.uid() or creado_por = auth.uid()))
);

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
