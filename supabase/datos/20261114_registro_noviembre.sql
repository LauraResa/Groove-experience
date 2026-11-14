-- =====================================================================
-- Roadmap y calendario · Registro retrospectivo 1–14/11/2026
-- SOLO AÑADE filas en roadmap_items. No modifica ni borra nada.
-- IDEMPOTENTE: cada fila se inserta solo si no existe ya una con el mismo título.
-- 12 registros con fecha real → aparecen en el roadmap y como hito en el calendario
--    (la vista calendario muestra roadmap_items con fecha_limite).
-- 3 registros sin fecha verificada → solo en el roadmap, SIN fecha (no salen en el calendario).
-- Todo es trabajo YA realizado: estado 'finalizado'. El estado comercial de cada
-- oportunidad va en comentarios (nada figura como contratado ni enviado sin confirmar).
-- No crea tareas, eventos, propuestas, actividades ni recordatorios.
-- Responsable: Laura · Cris como colaboradora donde participó.
-- =====================================================================
do $$
declare
  laura uuid := (select id from perfiles where lower(email) = 'lauraresa61@gmail.com');
  cris  uuid := (select id from perfiles where lower(email) = 'elbrochefinal@gmail.com');
  v_antes int := (select count(*) from roadmap_items);
begin
  if laura is null then raise exception 'No existe el usuario de Laura. No se ha cambiado nada.'; end if;

  -- 1 · Registros con fecha real
  insert into roadmap_items (semana, area, objetivo, titulo, responsable_id, colaborador_id, fecha_inicio, fecha_limite, estado, prioridad, comentarios)
  select v.semana, v.area, v.objetivo, v.titulo, laura, v.colab, v.ini::date, v.fin::date, 'finalizado'::estado_tarea, v.prioridad::prioridad, v.comentarios
  from (values
    (3, 'Comercial', 'Seguimiento de oportunidades', '06/11 · Solicitud Moksh · 50 cumpleaños', '2026-11-06', '2026-11-06', null::uuid, 'media', 'Solicitud recibida: 50 cumpleaños de su padre, 21/11/2026, ~100 asistentes. Alternativas 20, 21 y 22/11. Propuesta de alquiler exclusivo, catering, bebidas y celebración posterior. Alquiler ref. 1.500€ + IVA; cóctel ref. 55€/persona. Contacto: Moksh (lead plataforma). Estado: Propuesta comercial trabajada. Resultado: Fecha de envío de respuesta pendiente de recuperar del registro original. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comunicación', 'Marketing y comunicación', '10/11 · Activación inicial Instagram', '2026-11-10', '2026-11-10', null, 'media', 'Difusión del perfil entre contactos personales; estrategia inicial de seguidores e interacción; movilización del equipo; planificación de contenidos (proyecto, espacios, experiencias, montajes reales). Contacto: @groovexperience.events. Estado: Difusión inicial realizada. Resultado: Sin publicaciones confirmadas. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'LinkedIn y networking', '11/11 · Prospección LinkedIn · 18 contactos', '2026-11-11', '2026-11-11', null, 'media', '18 contactos a agencias, marketing, responsables de eventos y marcas. Primera aproximación: espacio para eventos corporativos, activaciones y experiencias. Contacto: Experientia, Two Poles, RPA, ISDIN, Rituals… · Nieves Sotelo, Claudia García, Marta Santos, Sabrina García, Álvaro González, Elena González, Myriam Gredilla. Estado: Prospección realizada. Resultado: Sin respuestas en el registro inicial. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'Captación comercial', '11/11 · Hitachi Rail · oportunidad identificada', '2026-11-11', '2026-11-11', null, 'media', 'Oportunidad para eventos, team buildings, comidas y cenas corporativas. Contacto: Elena Chavarría (Hitachi Rail) · ref. Pablo Martínez. Estado: Oportunidad identificada. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'Captación comercial', '12/11 · Hitachi Rail · email de presentación', '2026-11-12', '2026-11-12', null, 'media', 'Correo de presentación de The Groove Experience; enfoque celebraciones y propuestas navideñas. Contacto: Elena Chavarría (Hitachi Rail). Estado: Correo enviado. Resultado: Sin respuesta registrada. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'Agencias y clientes', '12/11 · RPA · solicitud evento 430 pax', '2026-11-12', '2026-11-12', null, 'alta', 'Recepción y análisis: 430 asistentes; montaje y ensayos 05/05/2027; evento 06/05/2027; alternativas 12 y 13/05/2027. Coffee breaks, plenaria, premios, cóctel, banquete, barra libre y DJ, AV, espacios, catering, planos y condiciones. Disponibilidad revisada; comunicado que se prepara propuesta. Contacto: Carolina (RPA Madrid). Estado: Propuesta en elaboración. Resultado: Sin contratación confirmada. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'Presupuestos y dossiers', '12–13/11 · RPA · desarrollo propuesta económica', '2026-11-12', '2026-11-13', cris, 'alta', 'Alquiler ref. 6.500€ + IVA; opción integral y alquiler exclusivo; técnica (escenario, LED, microfonía, iluminación, sonido); personal, mobiliario, proveedores; catering y barra libre; montaje y transformación de sala. Contacto: RPA · Cris, Rubén. Estado: Propuesta desarrollada y revisada. Registro retrospectivo (trabajo realizado).'),
    (4, 'Operativa', 'Coordinación interna y proveedores', '13/11 · RPA · revisión técnica y operativa con Rubén', '2026-11-13', '2026-11-13', null, 'alta', 'AV instalado incluido en alquiler; pantalla LED 10 × 2,25 m prevista para diciembre; técnico de sonido 33€/h; barra libre ilimitada, 3 barras, 6 camareros + 1 office; mobiliario disponible y complemento vía Inbodas; distribución plenaria/cóctel/banquete; coffee y cóctel en exterior si el tiempo lo permite. Contacto: Rubén. Estado: Información recibida y analizada. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'Presupuestos y dossiers', '13–14/11 · RPA · revisión dossier económico', '2026-11-13', '2026-11-14', null, 'alta', 'Coffee break único 8€/persona (17:00, productos restantes a las 19:00); cóctel 10€; 3 menús a 55€; mobiliario y menaje incluidos; especial bajo presupuesto; barra libre 90 min 21€; técnicos por horas; coordinación 2 Event Managers adicional; cancelación aprobada. Integral: 47.520€ + 5.533€ IVA = 53.053€. Alquiler exclusivo: 6.500€ base, 7.865€ total. Contacto: Carolina (RPA). Estado: Presupuesto revisado. Resultado: Envío definitivo a Carolina no confirmado. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'LinkedIn y networking', '14/11 · LinkedIn · Carmen Cardona', '2026-11-14', '2026-11-14', null, 'media', 'Facilitó email de contacto. Contacto: Carmen Cardona (Healthy Poke). Estado: Respondió. Resultado: Email de contacto recibido. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'LinkedIn y networking', '14/11 · LinkedIn · Álvaro González', '2026-11-14', '2026-11-14', null, 'media', 'Solicitó recibir el dossier. Contacto: Álvaro González. Estado: Respondió · dossier solicitado. Resultado: Envío del dossier no confirmado. Registro retrospectivo (trabajo realizado).'),
    (4, 'Comercial', 'LinkedIn y networking', '14/11 · LinkedIn · Jorge Gamboa', '2026-11-14', '2026-11-14', null, 'media', 'Rechazó la propuesta. Contacto: Jorge Gamboa. Estado: Descartada. Resultado: Rechazo. Registro retrospectivo (trabajo realizado).')
  ) as v(semana, area, objetivo, titulo, ini, fin, colab, prioridad, comentarios)
  where not exists (select 1 from roadmap_items r where r.titulo = v.titulo);

  -- 2 · Registros históricos pendientes de fechar (sin fecha → fuera del calendario)
  insert into roadmap_items (area, objetivo, titulo, responsable_id, estado, prioridad, comentarios)
  select v.area, v.objetivo, v.titulo, laura, 'finalizado'::estado_tarea, 'media'::prioridad, v.comentarios
  from (values
    ('Comercial', 'Propuestas de Navidad', 'Sin fecha · Campaña comercial Navidad', 'Propuestas de comidas/cenas corporativas, celebraciones y afterworks; prioridad comidas entre semana; revisión dossier y condiciones; tarifas con Rubén; captación a RR. HH., agencias, bancos, aseguradoras, corredurías; alternativas alquiler exclusivo o con servicios. Contacto: Empresas Madrid, Pinto, Valdemoro · Rubén. Estado: Campaña trabajada. Resultado: No registrar como enviadas sin documentación. Periodo: 1ª quincena nov. 2026; fecha exacta no verificada.'),
    ('Comercial', 'Propuestas de Navidad', 'Sin fecha · Propuesta 5 comidas corporativas', 'Negociación alquiler: petición cliente 5.000€, propuesta interna 6.000€, mínimo valorado 5.500€. Contacto: Cliente no identificado. Estado: En negociación. Periodo: 1ª quincena nov. 2026; fecha exacta no verificada.'),
    ('Comercial', 'Seguimiento de oportunidades', 'Sin fecha · VenuesPlace · Oriana y Aleska', 'Gestión y seguimiento; visita técnica concertada para el 21/11/2026 a las 11:30. Contacto: Oriana, Aleska. Estado: Visita concertada. Resultado: Visita no realizada (fecha posterior). Periodo: 1ª quincena nov. 2026; fecha exacta no verificada.')
  ) as v(area, objetivo, titulo, comentarios)
  where not exists (select 1 from roadmap_items r where r.titulo = v.titulo);

  raise notice 'Filas añadidas: %', (select count(*) from roadmap_items) - v_antes;
end $$;
