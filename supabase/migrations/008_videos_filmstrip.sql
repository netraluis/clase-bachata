-- Tira de fotogramas generada por el worker (una imagen con 14 fotogramas en fila).
-- Aplicada en Supabase como migración "videos_filmstrip_key".
alter table videos add column filmstrip_key text;
create index videos_filmstrip_pending_idx on videos (created_at) where filmstrip_key is null;
