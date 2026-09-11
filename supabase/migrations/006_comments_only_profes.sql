-- Las notas las escriben solo profes y admin. Los alumnos las leen.
-- Aplicada en Supabase como migración "comments_only_profes".
drop policy "autenticados comentan" on comments;
create policy "profes y admin escriben notas" on comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and author_role = (select private.current_user_role())
    and author_role in ('admin', 'profe')
  );
