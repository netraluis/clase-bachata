-- Editar título y nota de un vídeo: admin, o el profe que lo subió.
-- Aplicada en Supabase como migración "videos_update_policy".
create policy "admin y autor editan"
  on videos for update to authenticated
  using (
    (select private.current_user_role()) = 'admin'
    or ((select auth.uid()) = uploaded_by and (select private.current_user_role()) = 'profe')
  )
  with check (
    (select private.current_user_role()) = 'admin'
    or ((select auth.uid()) = uploaded_by and (select private.current_user_role()) = 'profe')
  );
