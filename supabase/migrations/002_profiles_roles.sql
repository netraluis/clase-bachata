-- Roles en la base de datos: admin, profe, alumno.
-- Aplicada en Supabase como migración "profiles_and_roles".
create type user_role as enum ('admin', 'profe', 'alumno');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role user_role not null default 'alumno',
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Esquema no expuesto por la API para las funciones auxiliares.
create schema if not exists private;
grant usage on schema private to authenticated;

-- Rol del usuario que hace la petición. SECURITY DEFINER para poder leer
-- profiles desde las políticas de profiles sin recursión. Solo devuelve el
-- rol del propio auth.uid(), nunca el de otro.
create or replace function private.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;
revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated;

-- Crear el perfil al registrarse (rol alumno por defecto).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- profiles: cada uno lee el suyo; el admin lee y edita todos.
create policy "cada uno lee su perfil"
  on profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "admin lee todos los perfiles"
  on profiles for select to authenticated
  using ((select private.current_user_role()) = 'admin');

create policy "admin cambia roles"
  on profiles for update to authenticated
  using ((select private.current_user_role()) = 'admin')
  with check ((select private.current_user_role()) = 'admin');

-- videos: suben admin y profe; leen todos los autenticados (política de 001).
drop policy "solo el autor inserta" on videos;
create policy "profes y admin insertan"
  on videos for insert to authenticated
  with check (
    (select auth.uid()) = uploaded_by
    and (select private.current_user_role()) in ('admin', 'profe')
  );

create policy "admin y autor borran"
  on videos for delete to authenticated
  using (
    (select private.current_user_role()) = 'admin'
    or ((select auth.uid()) = uploaded_by and (select private.current_user_role()) = 'profe')
  );

-- Backfill de usuarios ya registrados y primer admin.
insert into profiles (id, email, display_name)
select id, lower(email), coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
from auth.users
on conflict (id) do nothing;

update profiles set role = 'admin' where email = 'netraluis@gmail.com';
