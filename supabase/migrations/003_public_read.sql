-- La vista de alumnos es pública: lectura de vídeos y latido sin sesión.
-- Escribir sigue requiriendo sesión y rol (políticas de 002).
-- Aplicada en Supabase como migración "public_read_videos".
create policy "lectura pública de vídeos"
  on videos for select
  to anon
  using (true);

create policy "lectura pública del latido"
  on worker_heartbeat for select
  to anon
  using (true);
