-- Título de la clase (sesión). Si es nulo, la interfaz muestra "Clase del <fecha>".
-- Aplicada en Supabase como migración "sessions_title".
alter table sessions add column title text;
