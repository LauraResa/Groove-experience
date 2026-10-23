-- =====================================================================
-- Roadmap · Inicio operativo de THE GROOVE EXPERIENCE (22/10/2026)
-- SOLO AÑADE filas en roadmap_items. No modifica ni borra nada.
-- IDEMPOTENTE: cada fila se inserta solo si no existe ya una con el mismo título.
-- Ejecutarlo dos veces no duplica nada.
-- Responsable: Laura · Colaboradora: Cristina (si Cristina aún no tiene usuario,
-- queda vacío y su nombre figura igualmente en los comentarios).
-- =====================================================================
do $$
declare
  v_laura    uuid := (select id from perfiles where lower(email) = 'lauraresa61@gmail.com');
  v_cristina uuid := (select id from perfiles where nombre ilike 'cristina%' order by creado_en limit 1);
  v_hito     uuid;
  v_accesos  uuid;
  c_hecho    text := 'Laura y Cristina. Trabajo realizado el 22 y 23/10/2026; registrado después en la app.';
begin
  -- 1 · Hito
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, fecha_inicio, fecha_limite, estado, prioridad, comentarios)
  select 1, 'Hito', 'Inicio operativo', 'Inicio operativo de THE GROOVE EXPERIENCE', v_laura, v_cristina, '2026-10-22', '2026-10-22', 'finalizado', 'alta',
         'Inicio operativo de la colaboración. Contrato pendiente de firma. Laura y Cristina.'
  where not exists (select 1 from roadmap_items where titulo = 'Inicio operativo de THE GROOVE EXPERIENCE');
  select id into v_hito from roadmap_items where titulo = 'Inicio operativo de THE GROOVE EXPERIENCE' order by id limit 1;

  -- 2-9 · Realizado (22 y 23/10/2026)
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, depende_de_id, fecha_inicio, fecha_limite, estado, prioridad, comentarios)
  select 1, v.area, 'Inicio operativo (22–23/10/2026)', v.titulo, v_laura, v_cristina, v_hito, '2026-10-22'::date, '2026-10-23'::date, 'finalizado'::estado_tarea, v.prioridad::prioridad, c_hecho
  from (values
    ('Operativa',    'Desarrollo y puesta en marcha de la aplicación de gestión de THE GROOVE EXPERIENCE', 'alta'),
    ('Operativa',    'Creación del Excel / checklist de arranque para centralizar la información pendiente de recibir por parte de Groove', 'alta'),
    ('Comunicación', 'Briefing de desarrollo de identidad corporativa', 'media'),
    ('Comunicación', 'Estudio de viabilidad del naming THE GROOVE EXPERIENCE', 'media'),
    ('Operativa',    'Revisión y organización del calendario de eventos', 'media'),
    ('Comercial',    'Definición inicial de líneas y formatos comerciales', 'alta'),
    ('Comercial',    'Estructura y planteamiento de los dosieres comerciales de THE GROOVE EXPERIENCE y de sus diferentes líneas', 'alta'),
    ('Operativa',    'Organización de la información y documentación base necesaria para comenzar el desarrollo comercial y operativo', 'media')
  ) as v(area, titulo, prioridad)
  where not exists (select 1 from roadmap_items r where r.titulo = v.titulo);

  -- 10-11 · En curso (sin dependencia)
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, estado, prioridad, comentarios)
  select 2, v.area, 'En curso', v.titulo, v_laura, v_cristina, 'en_curso'::estado_tarea, 'alta'::prioridad, v.comentarios
  from (values
    ('Comercial', 'Dossier general de THE GROOVE EXPERIENCE', 'Laura y Cristina.'),
    ('Operativa', 'Accesos a plataformas y herramientas', 'Pendiente de terceros. Laura y Cristina.')
  ) as v(area, titulo, comentarios)
  where not exists (select 1 from roadmap_items r where r.titulo = v.titulo);
  select id into v_accesos from roadmap_items where titulo = 'Accesos a plataformas y herramientas' order by id limit 1;

  -- 12-13 · En curso (dependen de los accesos)
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, depende_de_id, estado, prioridad, comentarios)
  select 2, 'Comercial', 'En curso', v.titulo, v_laura, v_cristina, v_accesos, 'en_curso'::estado_tarea, v.prioridad::prioridad, 'En cuanto tengamos los accesos. Laura y Cristina.'
  from (values
    ('Revisión y respuesta de emails y solicitudes pendientes', 'alta'),
    ('Gestión y seguimiento de nuevas solicitudes', 'media')
  ) as v(titulo, prioridad)
  where not exists (select 1 from roadmap_items r where r.titulo = v.titulo);

  -- 14-18 · Próximos pasos previstos (sin fecha acordada)
  insert into roadmap_items (area, objetivo, titulo, responsable_id, colaborador_id, estado, prioridad, comentarios)
  select v.area, 'Próximos pasos previstos', v.titulo, v_laura, v_cristina, 'pendiente'::estado_tarea, v.prioridad::prioridad, 'Laura y Cristina.'
  from (values
    ('Comercial',    'Desarrollo de los dosieres específicos de las líneas', 'alta'),
    ('Comunicación', 'Agendar el primer shooting comercial', 'media'),
    ('Comercial',    'Activar la campaña de Navidad', 'alta'),
    ('Desarrollo',   'Dar forma al Social Club', 'media'),
    ('Operativa',    'Completar la información pendiente del checklist', 'media')
  ) as v(area, titulo, prioridad)
  where not exists (select 1 from roadmap_items r where r.titulo = v.titulo);
end $$;
