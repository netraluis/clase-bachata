-- Jerarquía: escuela → curso → sesión → vídeo → comentario.
-- Aplicada en Supabase como migración "hierarchy_school_course_session_comments".

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  weekday smallint check (weekday between 0 and 6), -- 0 domingo … 6 sábado (como Date.getDay)
  start_time time,
  created_at timestamptz not null default now()
);
create index courses_school_idx on courses (school_id);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (course_id, date)
);
create index sessions_course_date_idx on sessions (course_id, date desc);

-- vídeos: cuelgan de una sesión; class_date desaparece
alter table videos add column session_id uuid references sessions(id) on delete cascade;

with s as (
  insert into schools (name) values ('Clase de bachata') returning id
), c as (
  insert into courses (school_id, name, weekday) select id, 'Bachata', 4 from s returning id
)
insert into sessions (course_id, date)
select c.id, v.class_date from c, (select distinct class_date from videos) v;

update videos v set session_id = s.id from sessions s where s.date = v.class_date;
alter table videos alter column session_id set not null;
drop index if exists videos_class_date_idx;
alter table videos drop column class_date;
create index videos_session_idx on videos (session_id, created_at);

-- comentarios anclados a un segundo del vídeo. Autor, nombre y rol se
-- guardan en el momento de escribir: el rol puede cambiar después.
create table comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  author_name text not null,
  author_role user_role not null,
  t_seconds numeric(8,1) not null check (t_seconds >= 0),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_video_t_idx on comments (video_id, t_seconds);

-- RLS
alter table schools enable row level security;
alter table courses enable row level security;
alter table sessions enable row level security;
alter table comments enable row level security;

-- Lectura pública de toda la jerarquía (la vista de alumnos no exige login)
create policy "lectura pública" on schools for select to anon, authenticated using (true);
create policy "lectura pública" on courses for select to anon, authenticated using (true);
create policy "lectura pública" on sessions for select to anon, authenticated using (true);
create policy "lectura pública" on comments for select to anon, authenticated using (true);

-- Escuelas y cursos: solo admin
create policy "admin gestiona escuelas" on schools for all to authenticated
  using ((select private.current_user_role()) = 'admin')
  with check ((select private.current_user_role()) = 'admin');
create policy "admin gestiona cursos" on courses for all to authenticated
  using ((select private.current_user_role()) = 'admin')
  with check ((select private.current_user_role()) = 'admin');

-- Sesiones: las crean profes y admin al subir; las editan igual
create policy "profes y admin crean sesiones" on sessions for insert to authenticated
  with check ((select private.current_user_role()) in ('admin', 'profe'));
create policy "profes y admin editan sesiones" on sessions for update to authenticated
  using ((select private.current_user_role()) in ('admin', 'profe'))
  with check ((select private.current_user_role()) in ('admin', 'profe'));
create policy "admin borra sesiones" on sessions for delete to authenticated
  using ((select private.current_user_role()) = 'admin');

-- Comentarios: cualquiera con sesión escribe como sí mismo y con su rol real;
-- borra el autor o el admin.
create policy "autenticados comentan" on comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and author_role = (select private.current_user_role())
  );
create policy "autor o admin borran comentarios" on comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.current_user_role()) = 'admin'
  );
