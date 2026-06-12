-- HV-019: hard RIR floor for deadlift-pattern exercises
alter table exercises add column if not exists hard_rir_floor int;

update exercises set hard_rir_floor = 1
where name in ('Deadlift', 'Sumo Deadlift', 'Good Morning', 'Romanian Deadlift', 'Stiff-Leg Deadlift');

-- HV-013/HV-020: exercise tags for validation rules
alter table exercises add column if not exists exercise_tags text[];

update exercises set exercise_tags = array['deadlift']
where name in ('Deadlift', 'Sumo Deadlift', 'Stiff-Leg Deadlift', 'Romanian Deadlift');

update exercises set exercise_tags = array['barbell-row']
where name in ('Barbell Row (Bent Over)', 'T-Bar Row', 'Barbell Row', 'Bent Over Row');

update exercises set exercise_tags = array['overheadExtension']
where name in ('Skull Crusher (Barbell)', 'Skull Crusher (EZ-Bar)', 'Overhead Tricep Extension (Cable)', 'Overhead Tricep Extension (Dumbbell)', 'Dumbbell Overhead Tricep Extension', 'Cable Overhead Tricep Extension', 'Skull Crusher');
