-- Add body_weight column to user_profiles so it syncs across devices.
alter table public.user_profiles add column if not exists body_weight numeric;
