-- Saves one completed web workout as a single transaction. The caller's JWT
-- remains authoritative (security invoker + auth.uid); the payload can never
-- choose another owner. Reusing workout_id is an idempotent retry.
create or replace function public.save_web_workout(
  p_workout_id uuid,
  p_program_day_id uuid,
  p_name text,
  p_program_name text,
  p_completed_at timestamptz,
  p_exercises jsonb,
  p_feedback jsonb default '[]'::jsonb
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id text := (select auth.uid())::text;
  v_exercise jsonb;
  v_set jsonb;
  v_feedback jsonb;
  v_exercise_index integer := 0;
  v_set_index integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Workout name is required'; end if;
  if jsonb_typeof(p_exercises) <> 'array' then raise exception 'Exercises must be an array'; end if;

  if p_program_day_id is not null and not exists (
    select 1 from program_days pd join programs p on p.id = pd.program_id
    where pd.id = p_program_day_id and p.user_id = v_user_id and p.deleted_at is null
  ) then raise exception 'Program day not found'; end if;

  if exists (select 1 from workouts where id = p_workout_id and user_id = v_user_id) then
    return 'already_saved';
  end if;

  insert into workouts(id,user_id,name,program_name,program_day_id,completed_at)
  values(p_workout_id,v_user_id,trim(p_name),p_program_name,p_program_day_id::text,p_completed_at);

  for v_exercise in select value from jsonb_array_elements(p_exercises) loop
    if coalesce(v_exercise->>'name','') = '' then raise exception 'Exercise name is required'; end if;
    if jsonb_typeof(v_exercise->'sets') <> 'array' then raise exception 'Exercise sets must be an array'; end if;
    v_set_index := 0;
    for v_set in select value from jsonb_array_elements(v_exercise->'sets') loop
      if coalesce((v_set->>'completed')::boolean,false) then
        if (v_set->>'reps')::integer < 0 or (v_set->>'reps')::integer > 1000 then raise exception 'Invalid reps'; end if;
        if (v_set->>'weight')::numeric < 0 or (v_set->>'weight')::numeric > 100000 then raise exception 'Invalid weight'; end if;
        if v_set->>'reportedRir' is not null and ((v_set->>'reportedRir')::integer < 0 or (v_set->>'reportedRir')::integer > 10) then raise exception 'Invalid RIR'; end if;
        insert into workout_sets(workout_id,exercise_name,muscle_group,muscle_priority,equipment,note,exercise_index,set_index,reps,weight,completed,rir,reported_rir)
        values(p_workout_id,v_exercise->>'name',nullif(v_exercise->>'muscleGroup',''),nullif(v_exercise->>'musclePriority',''),nullif(v_exercise->>'equipment',''),nullif(v_exercise->>'note',''),v_exercise_index,v_set_index,(v_set->>'reps')::integer,(v_set->>'weight')::numeric,true,nullif(v_set->>'rir','')::integer,nullif(v_set->>'reportedRir','')::integer);
      end if;
      v_set_index := v_set_index + 1;
    end loop;
    v_exercise_index := v_exercise_index + 1;
  end loop;

  if not exists(select 1 from workout_sets where workout_id = p_workout_id) then raise exception 'Complete at least one set'; end if;

  if jsonb_typeof(p_feedback) = 'array' then
    for v_feedback in select value from jsonb_array_elements(p_feedback) loop
      if coalesce(v_feedback->>'muscleGroup','') <> '' then
        insert into workout_feedback(workout_id,muscle_group,joint_pain,pump,volume,soreness)
        values(p_workout_id::text,v_feedback->>'muscleGroup',nullif(v_feedback->>'jointPain',''),nullif(v_feedback->>'pump',''),nullif(v_feedback->>'volume',''),nullif(v_feedback->>'soreness',''));
      end if;
    end loop;
  end if;

  if p_program_day_id is not null then
    update program_days set completed=true,skipped=false,completed_at=p_completed_at where id=p_program_day_id;
  end if;
  return 'saved';
end;
$$;

revoke all on function public.save_web_workout(uuid,uuid,text,text,timestamptz,jsonb,jsonb) from public, anon;
grant execute on function public.save_web_workout(uuid,uuid,text,text,timestamptz,jsonb,jsonb) to authenticated;

alter table public.user_profiles
  add column if not exists experience_level text not null default 'intermediate'
  check (experience_level in ('beginner','intermediate','advanced'));
