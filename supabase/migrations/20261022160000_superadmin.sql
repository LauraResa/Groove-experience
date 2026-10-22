-- PENDIENTE: solo aplicadas en Supabase las 2 columnas "superadmin"; el resto falta por aplicar.
-- Superadmins: gestionan usuarios, roles y permisos
alter table perfiles add column superadmin boolean not null default false;
alter table usuarios_previstos add column superadmin boolean not null default false;

create or replace function es_superadmin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select superadmin and activo from perfiles where id = auth.uid()), false);
$$;
revoke execute on function es_superadmin() from public, anon;
grant execute on function es_superadmin() to authenticated;

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

-- Gestión de usuarios y permisos: solo superadmin
drop policy perfiles_adm on perfiles;
create policy perfiles_adm on perfiles for update to authenticated using (es_superadmin()) with check (es_superadmin());

drop policy permisos_adm on permisos;
create policy permisos_adm on permisos for all to authenticated using (es_superadmin()) with check (es_superadmin());

drop policy roles_adm on roles;
create policy roles_adm on roles for all to authenticated using (es_superadmin()) with check (es_superadmin());

drop policy usuarios_previstos_adm on usuarios_previstos;
drop policy usuarios_previstos_sel on usuarios_previstos;
create policy usuarios_previstos_adm on usuarios_previstos for all to authenticated using (es_superadmin()) with check (es_superadmin());

-- Superadmins iniciales
insert into usuarios_previstos (email, nombre, rol_clave, superadmin) values
  ('lauraresa61@gmail.com', 'Laura', 'admin_tge', true),
  ('elbrochefinal@gmail.com', 'El Broche Final', 'admin_tge', true)
on conflict (email) do update set superadmin = true, rol_clave = 'admin_tge';
