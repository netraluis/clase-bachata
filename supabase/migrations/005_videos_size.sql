-- Tamaño del fichero, para la cifra de almacenamiento en administración.
-- Aplicada en Supabase como migración "videos_size_bytes".
alter table videos add column size_bytes bigint;
