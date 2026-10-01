-- Targets and their evidence are written in the same statement. Historical
-- snapshots are append-only; they are never reconstructed with newer rules.
alter table public.program_day_targets add column decision_evidence jsonb;
alter table public.workouts add column progression_completed_at timestamptz;
-- Historic saves retain their existing targets. New saves start pending.
update public.workouts set progression_completed_at=now();

create table public.workout_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  source_workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  evidence jsonb not null,
  created_at timestamptz not null default now()
);
create index workout_decisions_day_exercise on public.workout_decisions(program_day_id,exercise_name,created_at desc);
create index workout_decisions_user on public.workout_decisions(user_id);
create index workout_decisions_source on public.workout_decisions(source_workout_id);
alter table public.workout_decisions enable row level security;
grant select,insert,delete on public.workout_decisions to authenticated;
create policy decisions_read on public.workout_decisions for select to authenticated using (
  user_id=(select auth.uid()) and exists(select 1 from public.workouts w where w.id=source_workout_id and w.deleted_at is null)
);
create policy decisions_insert on public.workout_decisions for insert to authenticated with check (
  user_id=(select auth.uid())
  and exists(select 1 from public.workouts w where w.id=source_workout_id and w.user_id=auth.uid()::text and w.deleted_at is null)
  and exists(select 1 from public.program_days d join public.programs p on p.id=d.program_id where d.id=program_day_id and p.user_id=auth.uid()::text and p.deleted_at is null)
);
create policy decisions_delete on public.workout_decisions for delete to authenticated using(user_id=(select auth.uid()));

create function public.archive_workout_decision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and new.decision_evidence is not distinct from old.decision_evidence then
    return new;
  end if;
  if new.decision_evidence is not null then
    insert into public.workout_decisions(user_id,program_day_id,source_workout_id,exercise_name,evidence)
    values(auth.uid(),new.program_day_id,(new.decision_evidence->>'sourceWorkoutId')::uuid,new.exercise_name,new.decision_evidence);
  end if;
  return new;
end $$;
revoke all on function public.archive_workout_decision() from public,anon;
create trigger archive_workout_decision after insert or update on public.program_day_targets
for each row execute function public.archive_workout_decision();

create function public.clear_stale_workout_decision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.decision_evidence is not distinct from old.decision_evidence
    and (new.target_sets,new.target_reps_min,new.target_reps_max,new.target_weight,new.rir)
      is distinct from (old.target_sets,old.target_reps_min,old.target_reps_max,old.target_weight,old.rir)
  then new.decision_evidence=null; end if;
  return new;
end $$;
revoke all on function public.clear_stale_workout_decision() from public,anon;
create trigger clear_stale_workout_decision before update on public.program_day_targets
for each row execute function public.clear_stale_workout_decision();

-- Remove copied evidence too when ANY contributing workout is deleted, not
-- merely when the workout that triggered the calculation is deleted.
create function public.remove_deleted_workout_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
declare reference jsonb;
begin
  if tg_op='UPDATE' and (new.deleted_at is null or old.deleted_at is not null) then return new; end if;
  reference=jsonb_build_object('sessions',jsonb_build_array(jsonb_build_object('workoutId',old.id::text)));
  delete from public.workout_decisions where source_workout_id=old.id or evidence @> reference;
  update public.program_day_targets set decision_evidence=null
    where decision_evidence->>'sourceWorkoutId'=old.id::text or decision_evidence @> reference;
  return null;
end $$;
revoke all on function public.remove_deleted_workout_evidence() from public,anon;
create trigger remove_deleted_workout_evidence after delete or update of deleted_at on public.workouts
for each row execute function public.remove_deleted_workout_evidence();

create function public.save_progression_targets(p_workout_id uuid,p_targets jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare source public.workouts%rowtype; item jsonb; source_program uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into source from public.workouts where id=p_workout_id and user_id=auth.uid()::text and deleted_at is null for update;
  if not found then raise exception 'Workout not found'; end if;
  if source.progression_completed_at is not null then return; end if;
  select program_id into source_program from public.program_days where id=source.program_day_id;
  if jsonb_typeof(p_targets)<>'array' then raise exception 'Invalid targets'; end if;
  for item in select * from jsonb_array_elements(p_targets) loop
    if item->'decision_evidence'->>'sourceWorkoutId' is distinct from p_workout_id::text
      or not exists(select 1 from public.program_days d join public.programs p on p.id=d.program_id
        where d.id=(item->>'program_day_id')::uuid and d.program_id=source_program and p.user_id=auth.uid()::text and p.deleted_at is null)
    then raise exception 'Invalid target ownership'; end if;
    insert into public.program_day_targets(program_day_id,exercise_name,target_sets,target_reps_min,target_reps_max,target_weight,rir,ai_rationale,decision_evidence)
    values((item->>'program_day_id')::uuid,item->>'exercise_name',(item->>'target_sets')::int,(item->>'target_reps_min')::int,(item->>'target_reps_max')::int,(item->>'target_weight')::float,(item->>'rir')::int,item->>'ai_rationale',item->'decision_evidence')
    on conflict(program_day_id,exercise_name) do update set
      target_sets=excluded.target_sets,target_reps_min=excluded.target_reps_min,target_reps_max=excluded.target_reps_max,
      target_weight=excluded.target_weight,rir=excluded.rir,ai_rationale=excluded.ai_rationale,decision_evidence=excluded.decision_evidence
    -- An older queued save must never overwrite a newer workout's decision.
    where coalesce((select w.completed_at from public.workouts w where w.id=(program_day_targets.decision_evidence->>'sourceWorkoutId')::uuid),'-infinity'::timestamp)<=source.completed_at;
  end loop;
  update public.workouts set progression_completed_at=now() where id=p_workout_id;
end $$;
revoke all on function public.save_progression_targets(uuid,jsonb) from public,anon;
grant execute on function public.save_progression_targets(uuid,jsonb) to authenticated;

-- Shared doctrine only: personal workout data is retrieved by exact identity.
create extension if not exists vector with schema extensions;
create table public.training_rule_chunks (
  revision text not null,
  chunk_id text not null,
  embedding_model text not null default '',
  file text not null,
  line integer not null,
  tags text[] not null,
  content text not null,
  embedding extensions.vector,
  fts tsvector generated always as (to_tsvector('english',content)) stored,
  primary key(revision,chunk_id,embedding_model)
);
create index training_rule_chunks_fts on public.training_rule_chunks using gin(fts);
alter table public.training_rule_chunks enable row level security;
grant select on public.training_rule_chunks to authenticated;
grant all on public.training_rule_chunks to service_role;
create policy rules_read on public.training_rule_chunks for select to authenticated using(true);

-- Exact scan is intentional for the small, version-filtered doctrine corpus.
-- Vector dimensions and model identity must agree before cosine comparisons.
create function public.search_training_rules(p_revision text,p_query text,p_model text default '',p_embedding extensions.vector default null)
returns table(chunk_id text,file text,line integer,tags text[],content text)
language sql stable security invoker set search_path=public,extensions as $$
  with eligible as materialized (
    select * from public.training_rule_chunks c
    where c.revision=p_revision and c.embedding_model=p_model
      and (p_embedding is null or (c.embedding is not null and vector_dims(c.embedding)=vector_dims(p_embedding)))
  ), lexical as (
    select c.chunk_id,row_number() over(order by ts_rank_cd(c.fts,websearch_to_tsquery('english',left(p_query,1000))) desc,c.chunk_id) as rank
    from eligible c where c.fts @@ websearch_to_tsquery('english',left(p_query,1000)) limit 12
  ), semantic as (
    select c.chunk_id,row_number() over(order by c.embedding <=> p_embedding,c.chunk_id) as rank
    from eligible c where p_embedding is not null order by c.embedding <=> p_embedding limit 12
  )
  select c.chunk_id,c.file,c.line,c.tags,c.content from eligible c
  left join lexical l using(chunk_id) left join semantic s using(chunk_id)
  where l.rank is not null or s.rank is not null
  order by coalesce(1.0/(60+l.rank),0)+coalesce(1.0/(60+s.rank),0) desc,c.chunk_id limit 5;
$$;
revoke all on function public.search_training_rules(text,text,text,extensions.vector) from public,anon;
grant execute on function public.search_training_rules(text,text,text,extensions.vector) to authenticated;
