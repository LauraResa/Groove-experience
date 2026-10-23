-- =====================================================================
-- Cerrar fugas de permisos detectadas en la revisión:
--  · Comentarios: solo los ve quien puede ver la ficha comentada.
--  · Registro de cambios (actividad_log): guarda filas completas (con importes);
--    solo lo lee quien ve el módulo y, si el módulo tiene importes, quien tiene "Importes".
--  · Se retiran las funciones antiguas que escribían directamente en auth.users / auth.identities
--    (el alta de usuarios ya usa la invitación oficial de Supabase).
-- No borra ningún comentario, registro, usuario ni perfil.
-- =====================================================================
begin;

create or replace function modulo_de(e entidad) returns text language sql immutable as $$
  select case e
    when 'solicitud' then 'solicitudes' when 'lead' then 'leads' when 'campana' then 'leads'
    when 'cliente' then 'clientes' when 'contacto' then 'clientes'
    when 'propuesta' then 'propuestas' when 'evento' then 'eventos' when 'proveedor' then 'proveedores'
    when 'formato' then 'formatos' when 'roadmap' then 'roadmap' when 'tarea' then 'tareas'
    when 'documento' then 'documentos' end;
$$;

drop policy if exists com_sel on comentarios;
create policy com_sel on comentarios for select to authenticated
  using (tiene_permiso(modulo_de(entidad_tipo), 'ver'));
drop policy if exists com_ins on comentarios;
create policy com_ins on comentarios for insert to authenticated
  with check (tiene_permiso(modulo_de(entidad_tipo), 'ver') and autor_id = auth.uid());

drop policy if exists log_sel on actividad_log;
create policy log_sel on actividad_log for select to authenticated
  using (
    tiene_permiso(modulo_de(entidad_tipo), 'ver')
    and (modulo_de(entidad_tipo) not in ('leads', 'propuestas', 'eventos', 'clientes', 'proveedores', 'formatos', 'solicitudes')
         or tiene_permiso(modulo_de(entidad_tipo), 'ver_importes'))
  );

drop function if exists admin_crear_usuario(text, text, text, text, boolean);
drop function if exists admin_cambiar_password(uuid, text);

commit;
