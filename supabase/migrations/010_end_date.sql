-- Una clase puede acabar otro día (end_date; nula = el mismo día) y una hora
-- de fin anterior a la de inicio significa que acaba al día siguiente, tanto
-- en clases como en horarios semanales. Aplicada en Supabase como "sessions_end_date".

alter table sessions add column end_date date;

alter table sessions drop constraint sessions_time_check;
alter table sessions add constraint sessions_time_check
  check (end_time is null or start_time is not null);
alter table sessions add constraint sessions_end_date_check
  check (end_date is null or end_date >= date);

alter table course_slots drop constraint course_slots_check;
alter table course_slots add constraint course_slots_time_check
  check (end_time is null or start_time is not null);
