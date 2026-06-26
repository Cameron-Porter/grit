-- program_day_targets was added in 20260605000010 after the RLS migration ran,
-- so it never got its own enable + policy.  Without this, Supabase's default-deny
-- blocks all client reads/writes, which silently breaks progressive overload targets.

alter table public.program_day_targets enable row level security;

-- Scope through the same 2-hop chain used for program_exercises:
--   program_day_targets.program_day_id → program_days → programs.user_id
create policy "users_own_program_day_targets"
  on public.program_day_targets
  for all
  using (
    program_day_id in (
      select pd.id
      from   program_days pd
      join   programs p on p.id = pd.program_id
      where  p.user_id = auth.uid()::text
    )
  );
