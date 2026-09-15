-- Un curso puede tener varios horarios semanales (día + inicio + fin) y
-- clases sueltas en fecha fija con su hora (sessions.start_time/end_time).
-- Aplicada en Supabase como migración "course_slots".

create table course_slots (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 domingo … 6 sábado (como Date.getDay)
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  check (end_time is null or (start_time is not null and end_time > start_time))
);
create index course_slots_course_idx on course_slots (course_id, weekday, start_time);

-- El día/hora que tenía cada curso pasa a ser su primer horario.
insert into course_slots (course_id, weekday, start_time)
select id, weekday, start_time from courses where weekday is not null;

alter table courses drop column weekday, drop column start_time;

-- Hora de una clase concreta (las sueltas la fijan al crearse).
alter table sessions
  add column start_time time,
  add column end_time time,
  add constraint sessions_time_check check (end_time is null or (start_time is not null and end_time > start_time));

-- Un curso solo se borra cuando ya no le quedan clases.
alter table sessions drop constraint sessions_course_id_fkey;
alter table sessions add constraint sessions_course_id_fkey
  foreign key (course_id) references courses(id) on delete restrict;

-- RLS: lectura pública, gestión solo admin (como courses).
alter table course_slots enable row level security;
create policy "lectura pública" on course_slots for select to anon, authenticated using (true);
create policy "admin gestiona horarios" on course_slots for all to authenticated
  using ((select private.current_user_role()) = 'admin')
  with check ((select private.current_user_role()) = 'admin');
