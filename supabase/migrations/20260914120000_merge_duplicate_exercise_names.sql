-- Merge exercises that exist in the catalog twice under different names.
--
-- Two sources:
--
--   1. 20260722000002_sync_local_exercise_database.sql inserted the rules-fixture
--      spellings ('Cable Overhead Tricep Extension', 'Romanian Deadlift', ...).
--      Its guard only skipped a name that already existed verbatim, so every one
--      of these landed next to the row 20260629000001 had deliberately kept
--      ('Overhead Tricep Extension (Cable)', 'Romanian Deadlift (Barbell)').
--      20260722000003 then only collapsed byte-identical names, so they survived.
--
--   2. CSV-seeded rows (20260609000004) that duplicate a kept row and were missed
--      by the 20260629000001 pass ('Military Press', 'Lying Triceps Extensions').
--
--   3. Rows seeded twice under conflicting classifications. The reverse curls
--      existed as Forearms (seed) and Biceps (CSV); they are one elbow-flexion
--      movement, primarily biceps, so the Biceps rows are kept. 'Weighted Russian
--      Twist' (Dumbbell) and 'Weighted Russian Twists' (Bodyweight Loadable) are
--      one exercise; both log external load, so their history is compatible.
--
-- Every pair below is the same movement. With both names selectable, a program
-- could prescribe one on Monday and the other on Friday, and history,
-- progression and PRs — all keyed by exact exercise_name — split the lifter's
-- sessions across the two. The muscle_group and equipment columns describe the
-- KEPT row; retired rows are matched by name, as the app itself matches them.
--
-- For each pair this migration:
--   - copies catalog metadata the kept row is missing (e.g. hard_rir_floor and
--     the 'deadlift' tag only ever landed on 'Romanian Deadlift'),
--   - repoints user_exercises, whose FK to exercises is ON DELETE CASCADE and
--     would otherwise silently drop those rows,
--   - renames program_exercises, program_day_targets, workout_sets and
--     personal_records onto the kept name, merging history,
--   - deletes the retired catalog row.
--
-- The pair list must match RETIRED_EXERCISE_NAMES in
-- src/data/exerciseNameAliases.ts, which the save routes use to canonicalise
-- payloads built before this ran. A test enforces that.
--
-- Not applied — generated for review and run manually with supabase db push.

create temporary table exercise_name_merge (
  retired      text primary key,
  kept         text not null,
  muscle_group text not null,
  equipment    text not null
);

insert into exercise_name_merge (retired, kept, muscle_group, equipment) values
  -- ─── Re-inserted by 20260722000002 ──────────────────────────────────────────
  ('Incline Machine Press',              'Incline Machine Chest Press',          'Chest',      'Machine'),
  ('Pec Deck',                           'Pec Deck Fly',                         'Chest',      'Machine'),
  ('Dumbbell Fly',                       'Dumbbell Flyes',                       'Chest',      'Dumbbell'),
  ('Cable Fly Low to High',              'Low-to-High Cable Fly',                'Chest',      'Cable'),
  ('Pull-Up',                            'Pull-Up (Normal Grip)',                'Back',       'Bodyweight'),
  ('Barbell Row',                        'Barbell Row (Bent Over)',              'Back',       'Barbell'),
  ('Dumbbell Row',                       'Dumbbell Row (Single-Arm)',            'Back',       'Dumbbell'),
  ('Chest-Supported Row',                'Dumbbell Row (Supported)',             'Back',       'Dumbbell'),
  ('Rear Delt Fly',                      'Bent-Over Rear Delt Fly',              'Shoulders',  'Dumbbell'),
  ('Dumbbell Curl',                      'Dumbbell Curl (Both Arms)',            'Biceps',     'Dumbbell'),
  ('Preacher Curl',                      'Preacher Curl (Barbell)',              'Biceps',     'Barbell'),
  ('Skull Crusher',                      'Skull Crusher (Barbell)',              'Triceps',    'Barbell'),
  ('Dumbbell Overhead Tricep Extension', 'Overhead Tricep Extension (Dumbbell)', 'Triceps',    'Dumbbell'),
  ('Cable Overhead Tricep Extension',    'Overhead Tricep Extension (Cable)',    'Triceps',    'Cable'),
  ('Cable Tricep Pushdown',              'Tricep Pushdown (Bar)',                'Triceps',    'Cable'),
  ('Machine Tricep Press',               'Machine Tricep Extension',             'Triceps',    'Machine'),
  ('Front Squat',                        'Barbell Front Squat',                  'Quads',      'Barbell'),
  ('Romanian Deadlift',                  'Romanian Deadlift (Barbell)',          'Hamstrings', 'Barbell'),
  ('Dumbbell Romanian Deadlift',         'Romanian Deadlift (Dumbbell)',         'Hamstrings', 'Dumbbell'),
  ('Wrist Curl',                         'Barbell Wrist Curl',                   'Forearms',   'Barbell'),
  -- ─── CSV rows missed by 20260629000001 ──────────────────────────────────────
  ('Cable Rear Delt Flyes',              'Cable Rear Delt Fly',                  'Shoulders',  'Cable'),
  ('Dumbbell Rear Delt Flyes',           'Bent-Over Rear Delt Fly',              'Shoulders',  'Dumbbell'),
  ('Standing Bent-Over Dumbbell Laterals','Bent-Over Rear Delt Fly',             'Shoulders',  'Dumbbell'),
  ('Seated Bent-Over Dumbbell Laterals', 'Seated Dumbbell Rear Delt Raise',      'Shoulders',  'Dumbbell'),
  ('Military Press',                     'Barbell Overhead Press',               'Shoulders',  'Barbell'),
  ('Dumbbell Bicep Curl',                'Dumbbell Curl (Both Arms)',            'Biceps',     'Dumbbell'),
  ('Two-Hand Cable Curls',               'Cable Curl',                           'Biceps',     'Cable'),
  ('Cable Curls with Preacher Bench',    'Cable Preacher Curl',                  'Biceps',     'Cable'),
  ('Lying Triceps Extensions',           'Skull Crusher (Barbell)',              'Triceps',    'Barbell'),
  ('Lying Dumbbell Extensions',          'Dumbbell Skullcrushers',               'Triceps',    'Dumbbell'),
  ('French Press',                       'Overhead Barbell Tricep Extension',    'Triceps',    'Barbell'),
  ('Standing Triceps Presses',           'Overhead Barbell Tricep Extension',    'Triceps',    'Barbell'),
  ('Reverse Pressdowns',                 'Reverse Grip Tricep Pushdown',         'Triceps',    'Cable'),
  ('Close-or Medium-Grip Pulldowns',     'Close-Grip Lat Pulldown',              'Back',       'Cable'),
  ('Smith Machine Back Squat',           'Smith Machine Squat',                  'Quads',      'Smith Machine'),
  ('Standing Dumbbell Calf Raise',       'Dumbbell Calf Raise',                  'Calves',     'Dumbbell'),
  ('Standing Single Leg Curl',           'Standing Leg Curl',                    'Hamstrings', 'Machine'),
  ('Barbell Good Mornings',              'Good Morning (Hamstring Focus)',       'Hamstrings', 'Barbell'),
  -- ─── Same exercise, conflicting classification ──────────────────────────────
  ('Reverse Barbell Curl',               'Barbell Reverse Curl',                 'Biceps',     'Barbell'),
  ('Reverse Dumbbell Curl',              'Dumbbell Reverse Curl',                'Biceps',     'Dumbbell'),
  ('Weighted Russian Twists',            'Weighted Russian Twist',               'Abs',        'Dumbbell');

-- ─── Guard: only merge onto a kept row that really exists ──────────────────
-- If the live catalog has drifted and a kept row is missing (or sits under a
-- different muscle/equipment), skip that pair entirely rather than deleting the
-- only selectable copy of the exercise.
do $$
declare r record;
begin
  for r in
    select m.retired, m.kept from exercise_name_merge m
    where not exists (
      select 1 from exercises e
      where coalesce(e.is_custom, false) = false
        and e.name = m.kept and e.muscle_group = m.muscle_group and e.equipment = m.equipment
    )
  loop
    raise notice 'Skipping "%": kept exercise "%" is not in the catalog with the expected muscle and equipment', r.retired, r.kept;
  end loop;
end $$;

delete from exercise_name_merge m
where not exists (
  select 1 from exercises e
  where coalesce(e.is_custom, false) = false
    and e.name = m.kept and e.muscle_group = m.muscle_group and e.equipment = m.equipment
);

-- ─── 1. Carry metadata onto the kept row ───────────────────────────────────
-- Fill gaps only; a value already on the kept row wins. Where several retired
-- rows feed one kept row, the best-described one is used.
update exercises k
set description       = coalesce(k.description, src.description),
    movement_category = coalesce(k.movement_category, src.movement_category),
    fatigue_rating    = coalesce(k.fatigue_rating, src.fatigue_rating),
    rep_range_min     = coalesce(k.rep_range_min, src.rep_range_min),
    rep_range_max     = coalesce(k.rep_range_max, src.rep_range_max),
    hard_rir_floor    = coalesce(k.hard_rir_floor, src.hard_rir_floor),
    exercise_tags     = coalesce(k.exercise_tags, src.exercise_tags),
    log_mode          = coalesce(k.log_mode, src.log_mode)
from (
  select distinct on (m.kept)
         m.kept, m.muscle_group, m.equipment,
         r.description, r.movement_category, r.fatigue_rating, r.rep_range_min,
         r.rep_range_max, r.hard_rir_floor, r.exercise_tags, r.log_mode
  from exercise_name_merge m
  join exercises r
    on r.name = m.retired and coalesce(r.is_custom, false) = false
  order by m.kept,
           (r.hard_rir_floor is not null or r.exercise_tags is not null) desc,
           (r.movement_category is not null) desc,
           m.retired
) src
where k.name = src.kept
  and k.muscle_group = src.muscle_group
  and k.equipment = src.equipment
  and coalesce(k.is_custom, false) = false;

-- ─── 2. Repoint user_exercises before the cascade can reach it ─────────────
update user_exercises ue
set exercise_id = k.id
from exercise_name_merge m
join exercises r
  on r.name = m.retired and coalesce(r.is_custom, false) = false
join exercises k
  on k.name = m.kept and k.muscle_group = m.muscle_group and k.equipment = m.equipment and coalesce(k.is_custom, false) = false
where ue.exercise_id = r.id;

-- ─── 3. Program templates ──────────────────────────────────────────────────
-- A day that already holds the kept exercise (or would receive it from two
-- retired names at once) keeps the extra row under its old name: renaming it
-- would put the same exercise on one day twice, which the reorder endpoint
-- rejects. Those rows are counted in a notice at the end so they can be looked
-- at by hand; they still load and log, since the save route canonicalises names.
--
-- Equipment follows the kept exercise, since it sizes load jumps (HV-041).
-- muscle_group is left as stored: on a program row it is the slot the exercise
-- fills, and moving a Forearms slot's reverse curl to Biceps would silently
-- change that program's volume split.
with candidates as (
  select pe.id, m.kept, m.equipment,
         row_number() over (partition by pe.program_day_id, m.kept order by pe.sort_order, pe.id) as rn
  from program_exercises pe
  join exercise_name_merge m on m.retired = pe.exercise_name
  where not exists (
    select 1 from program_exercises o
    where o.program_day_id = pe.program_day_id and o.exercise_name = m.kept
  )
)
update program_exercises pe
set exercise_name = c.kept,
    equipment = c.equipment
from candidates c
where pe.id = c.id and c.rn = 1;

-- ─── 4. Per-day targets — unique (program_day_id, exercise_name) ───────────
with candidates as (
  select t.id, m.kept,
         row_number() over (partition by t.program_day_id, m.kept order by t.id) as rn
  from program_day_targets t
  join exercise_name_merge m on m.retired = t.exercise_name
  where not exists (
    select 1 from program_day_targets o
    where o.program_day_id = t.program_day_id and o.exercise_name = m.kept
  )
)
update program_day_targets t
set exercise_name = c.kept
from candidates c
where t.id = c.id and c.rn = 1;

-- ─── 5. Logged history ─────────────────────────────────────────────────────
-- No uniqueness on workout_sets; every set moves so progression and PRs see
-- the lifter's whole record for the exercise. Equipment follows, as above.
update workout_sets ws
set exercise_name = m.kept,
    equipment = m.equipment
from exercise_name_merge m
where ws.exercise_name = m.retired;

-- ─── 6. Personal records — unique (exercise_name, user_id) ─────────────────
-- Where a user holds records under more than one name for the same exercise,
-- keep the best one: a live record over a soft-deleted one, then heaviest
-- weight, then most reps, then most recent.
with affected as (
  select p.id, p.user_id, coalesce(m.kept, p.exercise_name) as kept_name,
         p.deleted_at, p.weight, p.reps, p.achieved_at
  from personal_records p
  left join exercise_name_merge m on m.retired = p.exercise_name
  where m.retired is not null
     or p.exercise_name in (select kept from exercise_name_merge)
),
ranked as (
  select id,
         row_number() over (
           partition by user_id, kept_name
           order by (deleted_at is null) desc, weight desc, reps desc nulls last, achieved_at desc nulls last, id
         ) as rn
  from affected
)
delete from personal_records p
using ranked r
where p.id = r.id and r.rn > 1;

update personal_records p
set exercise_name = m.kept,
    updated_at = now()
from exercise_name_merge m
where p.exercise_name = m.retired;

-- ─── 7. Retire the duplicate catalog rows ──────────────────────────────────
delete from exercises e
using exercise_name_merge m
where e.name = m.retired
  and coalesce(e.is_custom, false) = false;

-- ─── Report anything left for manual review ────────────────────────────────
do $$
declare
  v_program_rows int;
  v_target_rows int;
begin
  select count(*) into v_program_rows
  from program_exercises pe join exercise_name_merge m on m.retired = pe.exercise_name;
  select count(*) into v_target_rows
  from program_day_targets t join exercise_name_merge m on m.retired = t.exercise_name;
  if v_program_rows > 0 or v_target_rows > 0 then
    raise notice '% program_exercises and % program_day_targets rows kept a retired name because their day already has the kept exercise',
      v_program_rows, v_target_rows;
  end if;
end $$;

drop table exercise_name_merge;
