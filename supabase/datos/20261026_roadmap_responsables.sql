-- =====================================================================
-- Roadmap · corrección de responsables (requiere la migración 20261026090000)
-- SOLO ACTUALIZA filas existentes, buscadas por su título exacto. No inserta ni borra.
-- No toca estado ni fechas.
-- Si falta un usuario o un título no aparece exactamente una vez, se para y NO cambia nada.
-- Repetirlo no tiene efecto adicional.
-- =====================================================================
do $$
declare
  laura uuid := (select id from perfiles where lower(email) = 'lauraresa61@gmail.com');
  cris  uuid := (select id from perfiles where lower(email) = 'elbrochefinal@gmail.com');
  ruben uuid := (select id from perfiles where lower(email) = 'ruben.carmona@gruporodricid.com');
  rodri uuid := (select id from perfiles where lower(email) = 'rodrigr93@gmail.com');
  richy uuid := (select id from perfiles where lower(email) = 'ricardo@gruporodricid.com');
  juan  uuid := (select id from perfiles where lower(email) = 'juan.cid@gruporodricid.com');
  v_antes int := (select count(*) from roadmap_items);
  r record;
  n int;
begin
  if laura is null or cris is null or ruben is null or rodri is null or richy is null or juan is null then
    raise exception 'Falta algún usuario (Laura, Cris, Rubén, Rodri, Richy o Juan). No se ha cambiado nada.';
  end if;

  for r in select * from (values
    -- Hito conjunto: sin responsable individual
    ('Inicio operativo de THE GROOVE EXPERIENCE', null::uuid, null::uuid, array[ruben, rodri, richy, juan, laura, cris]),
    -- Realizado
    ('Briefing de desarrollo de identidad corporativa', cris, null, '{}'::uuid[]),
    ('Estudio de viabilidad del naming THE GROOVE EXPERIENCE', cris, null, '{}'),
    ('Revisión y organización del calendario de eventos', laura, cris, '{}'),
    ('Definición inicial de líneas y formatos comerciales', laura, cris, '{}'),
    ('Desarrollo y puesta en marcha de la aplicación de gestión de THE GROOVE EXPERIENCE', laura, cris, '{}'),
    ('Estructura y planteamiento de los dosieres comerciales de THE GROOVE EXPERIENCE y de sus diferentes líneas', laura, cris, '{}'),
    ('Creación del Excel / checklist de arranque para centralizar la información pendiente de recibir por parte de Groove', laura, cris, '{}'),
    ('Organización de la información y documentación base necesaria para comenzar el desarrollo comercial y operativo', laura, cris, '{}'),
    -- En curso
    ('Accesos a plataformas y herramientas', ruben, null, '{}'),
    ('Gestión y seguimiento de nuevas solicitudes', ruben, null, '{}'),
    ('Dossier general de THE GROOVE EXPERIENCE', laura, cris, '{}'),
    ('Revisión y respuesta de emails y solicitudes pendientes', laura, cris, '{}'),
    -- Pendiente
    ('Desarrollo de los dosieres específicos de las líneas', laura, cris, '{}'),
    ('Agendar el primer shooting comercial', cris, null, '{}'),
    ('Activar la campaña de Navidad', laura, cris, '{}'),
    ('Dar forma al Social Club', laura, cris, '{}'),
    ('Completar la información pendiente del checklist', laura, null, '{}')
  ) as t(titulo, resp, coresp, part)
  loop
    select count(*) into n from roadmap_items where titulo = r.titulo;
    if n <> 1 then
      raise exception 'El título «%» aparece % veces (se esperaba 1). No se ha cambiado nada.', r.titulo, n;
    end if;
    update roadmap_items set
      responsable_id    = r.resp,
      corresponsable_id = r.coresp,
      colaborador_id    = null,          -- la autoría queda en responsable / corresponsable / participantes
      participantes     = r.part,
      -- Solo se quita la coletilla «Laura y Cristina.»; el resto del comentario queda igual
      comentarios       = nullif(btrim(regexp_replace(coalesce(comentarios, ''), '\s*Laura y Cristina\.\s*', ' ', 'g')), '')
    where titulo = r.titulo
      and (responsable_id, corresponsable_id, colaborador_id, participantes, comentarios)
          is distinct from (r.resp, r.coresp, null::uuid, r.part,
                            nullif(btrim(regexp_replace(coalesce(comentarios, ''), '\s*Laura y Cristina\.\s*', ' ', 'g')), ''));
  end loop;

  if (select count(*) from roadmap_items) <> v_antes then
    raise exception 'El número de filas ha cambiado. No se ha cambiado nada.';
  end if;
  raise notice 'Roadmap actualizado: % filas (sin altas ni bajas).', v_antes;
end $$;
