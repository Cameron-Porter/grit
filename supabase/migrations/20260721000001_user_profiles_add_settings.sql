alter table public.user_profiles
  add column if not exists auto_match_weight boolean not null default false,
  add column if not exists use_preferred_equipment boolean not null default false,
  add column if not exists preferred_equipment jsonb not null default '["Barbell","Dumbbell","Cable","Bodyweight"]'::jsonb,
  add column if not exists theme text not null default 'dark',
  add column if not exists workout_reminders_enabled boolean not null default false;
