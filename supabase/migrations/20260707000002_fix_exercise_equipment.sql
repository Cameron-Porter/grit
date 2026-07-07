-- Fix incorrect equipment assignments in the exercises table
update public.exercises
set equipment = 'Dumbbell'
where name ilike '%overhead tricep extension%'
  and name ilike '%dumbbell%'
  and equipment != 'Dumbbell';
