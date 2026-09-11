-- Esquema v1. Ejecutar entero en Supabase → SQL Editor.
-- Incluye ya las columnas del worker (fase 1.5) para no migrar después.

create type video_status as enum ('pending', 'processing', 'ready', 'failed');

create table videos (
  id uuid primary key default gen_random_uuid(),
  r2_key text not null,
  thumb_key text,
  title text not null,
  class_date date not null,
  notes text,
  duration_s int,
  width int,
  height int,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now(),

  -- columnas del worker (fase 1.5)
  status video_status not null default 'ready',
  status_changed_at timestamptz default now(),
  error_msg text
);

create index videos_class_date_idx on videos (class_date desc);
create index videos_status_idx on videos (status) where status in ('pending', 'processing');

-- latido del worker, para saber si está vivo
create table worker_heartbeat (
  id int primary key default 1,
  last_seen timestamptz not null default now(),
  constraint solo_una_fila check (id = 1)
);
insert into worker_heartbeat (id) values (1);

alter table videos enable row level security;
alter table worker_heartbeat enable row level security;

create policy "todos los autenticados leen"
  on videos for select
  to authenticated
  using (true);

create policy "solo el autor inserta"
  on videos for insert
  to authenticated
  with check ((select auth.uid()) = uploaded_by);

create policy "todos los autenticados leen el latido"
  on worker_heartbeat for select
  to authenticated
  using (true);

-- El worker escribe con la service role key (salta RLS): sin política de update.
