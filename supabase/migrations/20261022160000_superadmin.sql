-- Superadmins: gestionan usuarios, roles y permisos; pueden crear usuarios desde la app
alter table perfiles add column if not exists superadmin boolean not null default false;
alter table usuarios_previstos add column if not exists superadmin boolean not null default false;

create or replace function es_superadmin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select superadmin and activo from perfiles where id = auth.uid()), false);
$$;

create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_prev usuarios_previstos;
begin
  select * into v_prev from usuarios_previstos where lower(email) = lower(new.email);
  insert into perfiles (id, nombre, email, rol_id, superadmin)
  values (new.id, coalesce(v_prev.nombre, split_part(new.email, '@', 1)), new.email,
          (select id from roles where clave = v_prev.rol_clave), coalesce(v_prev.superadmin, false))
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function sincronizar_previsto() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update perfiles set nombre = new.nombre, superadmin = new.superadmin,
         rol_id = (select id from roles where clave = new.rol_clave)
  where lower(email) = lower(new.email);
  return new;
end $$;

-- Alta de usuario con contraseña (solo superadmin)
create or replace function admin_crear_usuario(p_email text, p_password text, p_nombre text, p_rol_clave text, p_superadmin boolean default false)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(trim(p_email));
begin
  if not es_superadmin() then raise exception 'Solo una superadmin puede crear usuarios'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'Ya existe un usuario con ese email'; end if;

  insert into usuarios_previstos (email, nombre, rol_clave, superadmin)
  values (v_email, p_nombre, p_rol_clave, coalesce(p_superadmin, false))
  on conflict (email) do update set nombre = excluded.nombre, rol_clave = excluded.rol_clave, superadmin = excluded.superadmin;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', p_nombre), now(), now(),
    '', '', '', '');

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now());

  return v_id;
end $$;

-- Nueva contraseña para otro usuario (solo superadmin)
create or replace function admin_cambiar_password(p_usuario uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not es_superadmin() then raise exception 'Solo una superadmin puede cambiar contraseñas'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_usuario;
end $$;

revoke execute on function es_superadmin(), admin_crear_usuario(text, text, text, text, boolean), admin_cambiar_password(uuid, text) from public, anon;
grant execute on function es_superadmin(), admin_crear_usuario(text, text, text, text, boolean), admin_cambiar_password(uuid, text) to authenticated;

-- Gestión de usuarios y permisos: solo superadmin
drop policy if exists perfiles_adm on perfiles;
create policy perfiles_adm on perfiles for update to authenticated using (es_superadmin()) with check (es_superadmin());

drop policy if exists permisos_adm on permisos;
create policy permisos_adm on permisos for all to authenticated using (es_superadmin()) with check (es_superadmin());

drop policy if exists roles_adm on roles;
create policy roles_adm on roles for all to authenticated using (es_superadmin()) with check (es_superadmin());

drop policy if exists usuarios_previstos_adm on usuarios_previstos;
drop policy if exists usuarios_previstos_sel on usuarios_previstos;
create policy usuarios_previstos_adm on usuarios_previstos for all to authenticated using (es_superadmin()) with check (es_superadmin());

-- Superadmins iniciales
insert into usuarios_previstos (email, nombre, rol_clave, superadmin) values
  ('lauraresa61@gmail.com', 'Laura', 'admin_tge', true),
  ('elbrochefinal@gmail.com', 'El Broche Final', 'admin_tge', true)
on conflict (email) do update set superadmin = true, rol_clave = 'admin_tge';
