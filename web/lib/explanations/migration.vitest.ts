import { afterAll, beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const db=new PGlite({extensions:{vector}});
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const program='00000000-0000-4000-8000-000000000003',day='00000000-0000-4000-8000-000000000004',workout='00000000-0000-4000-8000-000000000005';
const nextDay='00000000-0000-4000-8000-000000000006';
beforeAll(async()=>{
  // Minimal pre-existing Supabase tables; new SQL runs unmodified below.
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create schema auth; create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table auth.users(id uuid primary key);
    create table public.programs(id uuid primary key,user_id text,deleted_at timestamp);
    create table public.program_days(id uuid primary key,program_id uuid references programs(id));
    create table public.workouts(id uuid primary key,user_id text,program_day_id uuid references program_days(id),completed_at timestamp,deleted_at timestamp);
    create table public.program_day_targets(id uuid primary key default gen_random_uuid(),program_day_id uuid references program_days(id),exercise_name text,target_sets int,target_reps_min int,target_reps_max int,target_weight float,rir int,ai_rationale text,unique(program_day_id,exercise_name));
    grant usage on schema public,auth,extensions to authenticated,anon;
    grant select,insert,update on all tables in schema public to authenticated;
    grant select on auth.users to authenticated;
    alter table workouts enable row level security;
    create policy owns_workout on workouts to authenticated using(user_id=auth.uid()::text) with check(user_id=auth.uid()::text);
    insert into auth.users values('${owner}'),('${other}');
    insert into programs values('${program}','${owner}',null);
    insert into program_days values('${day}','${program}'),('${nextDay}','${program}');
  `);
  await db.exec(readFileSync(new URL('../../../supabase/migrations/20261001100556_workout_explanations.sql',import.meta.url),'utf8'));
  await db.exec(`insert into workouts(id,user_id,program_day_id,completed_at) values('${workout}','${owner}','${day}','2026-10-01');set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`);
},30_000);
afterAll(async()=>db.close());

const row={program_day_id:nextDay,exercise_name:'Row',target_sets:3,target_reps_min:8,target_reps_max:12,target_weight:100,rir:2,ai_rationale:'Held',decision_evidence:{version:1,sourceWorkoutId:workout}};
it('atomically saves targets, archives one decision, and makes retries idempotent',async()=>{
  await db.query('select save_progression_targets($1,$2::jsonb)',[workout,JSON.stringify([row])]);
  await db.query('select save_progression_targets($1,$2::jsonb)',[workout,JSON.stringify([{...row,target_weight:999}])]);
  expect((await db.query('select target_weight from program_day_targets')).rows).toEqual([{target_weight:100}]);
  expect((await db.query('select count(*)::int as n from workout_decisions')).rows).toEqual([{n:1}]);
  expect((await db.query('select progression_completed_at is not null as done from workouts')).rows).toEqual([{done:true}]);
});
it('does not allow another account to retrieve or write private decisions',async()=>{
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  try{
    expect((await db.query('select * from workout_decisions')).rows).toEqual([]);
    await expect(db.query('select save_progression_targets($1,$2::jsonb)',[workout,JSON.stringify([row])])).rejects.toThrow('Workout not found');
    await expect(db.query('insert into workout_decisions(user_id,program_day_id,source_workout_id,exercise_name,evidence) values($1,$2,$3,$4,$5)',[other,nextDay,workout,'Row','{}'])).rejects.toThrow();
  }finally{await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`)}
});
it('clears stale evidence on a manual target edit without rewriting history',async()=>{
  await db.exec('update program_day_targets set target_weight=105');
  expect((await db.query('select decision_evidence from program_day_targets')).rows).toEqual([{decision_evidence:null}]);
  expect((await db.query('select count(*)::int as n from workout_decisions')).rows).toEqual([{n:1}]);
});
it('rolls back every target and snapshot if any target fails ownership validation',async()=>{
  const second='00000000-0000-4000-8000-000000000007';
  await db.query('insert into workouts(id,user_id,program_day_id,completed_at) values($1,$2,$3,$4)',[second,owner,day,'2026-10-02']);
  const valid={...row,decision_evidence:{version:1,sourceWorkoutId:second}};
  await expect(db.query('select save_progression_targets($1,$2::jsonb)',[second,JSON.stringify([valid,{...valid,program_day_id:other}])])).rejects.toThrow('Invalid target ownership');
  expect((await db.query('select target_weight from program_day_targets')).rows).toEqual([{target_weight:105}]);
  expect((await db.query('select count(*)::int as n from workout_decisions')).rows).toEqual([{n:1}]);
  expect((await db.query('select progression_completed_at from workouts where id=$1',[second])).rows).toEqual([{progression_completed_at:null}]);
});
it('hybrid search filters rule revision, model and vector dimensions before ranking',async()=>{
  await db.exec(`reset role;
    insert into training_rule_chunks(revision,chunk_id,embedding_model,file,line,tags,content,embedding) values
    ('current','one','embed','rule.ts',1,array['ST-015'],'Complete every set before adding load','[1,0,0]'),
    ('old','two','embed','rule.ts',1,array['ST-015'],'Older load rule','[1,0,0]'),
    ('current','three','different','rule.ts',1,array['ST-015'],'Different model load rule','[1,0,0]'),
    ('current','four','embed','rule.ts',1,array['ST-015'],'Different dimensions','[1,0]');
    set role authenticated;`);
  const result=await db.query('select chunk_id from search_training_rules($1,$2,$3,$4::extensions.vector)',['current','adding load','embed','[1,0,0]']);
  expect(result.rows).toEqual([{chunk_id:'one'}]);
  await db.exec('set role anon');
  try{await expect(db.query("select * from search_training_rules('current','load')")).rejects.toThrow('permission denied')}
  finally{await db.exec('set role authenticated')}
});
it('removes copied evidence when a contributing historical workout is soft-deleted',async()=>{
  const second='00000000-0000-4000-8000-000000000007';
  const changed={...row,decision_evidence:{version:1,sourceWorkoutId:second,sessions:[{workoutId:workout,sets:[{reps:12,weight:100}]}]}};
  await db.query('select save_progression_targets($1,$2::jsonb)',[second,JSON.stringify([changed])]);
  await db.query('update workouts set deleted_at=now() where id=$1',[workout]);
  expect((await db.query('select decision_evidence from program_day_targets')).rows).toEqual([{decision_evidence:null}]);
  expect((await db.query('select count(*)::int as n from workout_decisions')).rows).toEqual([{n:0}]);
});
