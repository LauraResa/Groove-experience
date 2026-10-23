-- =====================================================================
-- Roadmap · Inicio operativo de THE GROOVE EXPERIENCE (22/10/2026)
-- SOLO AÑADE 18 filas en roadmap_items. No modifica ni borra nada.
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
  values (1, 'Hito', 'Inicio operativo', 'Inicio operativo de THE GROOVE EXPERIENCE', v_laura, v_cristina, '2026-10-22', '2026-10-22', 'finalizado', 'alta',
          'Inicio operativo de la colaboración. Contrato pendiente de firma. Laura y Cristina.')
  returning id into v_hito;

  -- 2-9 · Realizado (22 y 23/10/2026)
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, depende_de_id, fecha_inicio, fecha_limite, estado, prioridad, comentarios) values
    (1, 'Operativa',    'Inicio operativo (22–23/10/2026)', 'Desarrollo y puesta en marcha de la aplicación de gestión de THE GROOVE EXPERIENCE', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'alta', c_hecho),
    (1, 'Operativa',    'Inicio operativo (22–23/10/2026)', 'Creación del Excel / checklist de arranque para centralizar la información pendiente de recibir por parte de Groove', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'alta', c_hecho),
    (1, 'Comunicación', 'Inicio operativo (22–23/10/2026)', 'Briefing de desarrollo de identidad corporativa', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'media', c_hecho),
    (1, 'Comunicación', 'Inicio operativo (22–23/10/2026)', 'Estudio de viabilidad del naming THE GROOVE EXPERIENCE', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'media', c_hecho),
    (1, 'Operativa',    'Inicio operativo (22–23/10/2026)', 'Revisión y organización del calendario de eventos', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'media', c_hecho),
    (1, 'Comercial',    'Inicio operativo (22–23/10/2026)', 'Definición inicial de líneas y formatos comerciales', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'alta', c_hecho),
    (1, 'Comercial',    'Inicio operativo (22–23/10/2026)', 'Estructura y planteamiento de los dosieres comerciales de THE GROOVE EXPERIENCE y de sus diferentes líneas', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'alta', c_hecho),
    (1, 'Operativa',    'Inicio operativo (22–23/10/2026)', 'Organización de la información y documentación base necesaria para comenzar el desarrollo comercial y operativo', v_laura, v_cristina, v_hito, '2026-10-22', '2026-10-23', 'finalizado', 'media', c_hecho);

  -- 10-12 · En curso
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, estado, prioridad, comentarios) values
    (2, 'Comercial', 'En curso', 'Dossier general de THE GROOVE EXPERIENCE', v_laura, v_cristina, 'en_curso', 'alta', 'Laura y Cristina.');
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, estado, prioridad, comentarios)
  values (2, 'Operativa', 'En curso', 'Accesos a plataformas y herramientas', v_laura, v_cristina, 'en_curso', 'alta', 'Pendiente de terceros. Laura y Cristina.')
  returning id into v_accesos;
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, depende_de_id, estado, prioridad, comentarios) values
    (2, 'Comercial', 'En curso', 'Revisión y respuesta de emails y solicitudes pendientes', v_laura, v_cristina, v_accesos, 'en_curso', 'alta', 'En cuanto tengamos los accesos. Laura y Cristina.');

  -- 13-18 · Próximos pasos previstos (sin fecha acordada)
  insert into roadmap_items (area, objetivo, titulo, responsable_id, colaborador_id, estado, prioridad, comentarios) values
    ('Comercial',    'Próximos pasos previstos', 'Desarrollo de los dosieres específicos de las líneas', v_laura, v_cristina, 'pendiente', 'alta', 'Laura y Cristina.'),
    ('Comunicación', 'Próximos pasos previstos', 'Agendar el primer shooting comercial', v_laura, v_cristina, 'pendiente', 'media', 'Laura y Cristina.'),
    ('Comercial',    'Próximos pasos previstos', 'Activar la campaña de Navidad', v_laura, v_cristina, 'pendiente', 'alta', 'Laura y Cristina.'),
    ('Desarrollo',   'Próximos pasos previstos', 'Dar forma al Social Club', v_laura, v_cristina, 'pendiente', 'media', 'Laura y Cristina.'),
    ('Comercial',    'Próximos pasos previstos', 'Gestionar nuevas solicitudes', v_laura, v_cristina, 'pendiente', 'media', 'Laura y Cristina.'),
    ('Operativa',    'Próximos pasos previstos', 'Completar la información pendiente del checklist', v_laura, v_cristina, 'pendiente', 'media', 'Laura y Cristina.');
end $$;
