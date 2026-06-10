-- Drop the restrictive read policy and replace with fully open read for all authenticated users.
-- Exercises are a shared library; there is no reason to restrict visibility by user.
drop policy if exists "users_read_exercises" on exercises;

create policy "authenticated_read_exercises" on exercises
  for select using (auth.role() = 'authenticated');
