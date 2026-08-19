-- Save AI-generated PWA programs in one database transaction instead of a
-- client-side chain of inserts plus best-effort cleanup deletes.
create or replace function public.save_ai_program(
  p_program jsonb,
  p_days jsonb,
  p_template_exercises jsonb,
  p_targets jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text := auth.uid()::text;
  v_program_id uuid := (p_program->>'id')::uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_program->>'user_id' is distinct from v_user_id then
    raise exception 'Program owner mismatch';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) = 0 then
    raise exception 'Program days are required';
  end if;
  if jsonb_typeof(p_template_exercises) <> 'array' or jsonb_array_length(p_template_exercises) = 0 then
    raise exception 'Program exercise templates are required';
  end if;
  if jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) = 0 then
    raise exception 'Program targets are required';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_days) as d(program_id uuid)
    where d.program_id is distinct from v_program_id
  ) then
    raise exception 'Program day owner mismatch';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_template_exercises) as e(program_day_id uuid)
    where not exists (select 1 from jsonb_to_recordset(p_days) as d(id uuid) where d.id = e.program_day_id)
  ) or exists (
    select 1
    from jsonb_to_recordset(p_targets) as t(program_day_id uuid)
    where not exists (select 1 from jsonb_to_recordset(p_days) as d(id uuid) where d.id = t.program_day_id)
  ) then
    raise exception 'Program child rows reference an unknown day';
  end if;

  insert into public.programs (id,user_id,name,total_weeks,days_per_week,focus,muscle_priorities,is_current)
  values (
    v_program_id,
    v_user_id,
    left(p_program->>'name', 120),
    (p_program->>'total_weeks')::int,
    (p_program->>'days_per_week')::int,
    coalesce(p_program->>'focus', 'hypertrophy'),
    coalesce(p_program->'muscle_priorities', '{}'::jsonb),
    coalesce((p_program->>'is_current')::boolean, false)
  );

  insert into public.program_days (id,program_id,week_number,day_number,label)
  select id, program_id, week_number, day_number, left(label, 80)
  from jsonb_to_recordset(p_days) as d(id uuid, program_id uuid, week_number int, day_number int, label text);

  insert into public.program_exercises (program_day_id,exercise_name,muscle_group,equipment,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rir,role)
  select program_day_id, exercise_name, muscle_group, equipment, sort_order, target_sets, target_reps_min, target_reps_max, target_weight, rir, role
  from jsonb_to_recordset(p_template_exercises) as e(program_day_id uuid, exercise_name text, muscle_group text, equipment text, sort_order int, target_sets int, target_reps_min int, target_reps_max int, target_weight double precision, rir int, role text);

  insert into public.program_day_targets (program_day_id,exercise_name,target_sets,target_reps_min,target_reps_max,target_weight,rir,ai_rationale)
  select program_day_id, exercise_name, target_sets, target_reps_min, target_reps_max, target_weight, rir, left(ai_rationale, 300)
  from jsonb_to_recordset(p_targets) as t(program_day_id uuid, exercise_name text, target_sets int, target_reps_min int, target_reps_max int, target_weight double precision, rir int, ai_rationale text);

  return v_program_id;
end;
$$;

revoke all on function public.save_ai_program(jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_ai_program(jsonb,jsonb,jsonb,jsonb) to authenticated;
