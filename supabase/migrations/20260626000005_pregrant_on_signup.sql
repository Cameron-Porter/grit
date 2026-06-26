-- ─────────────────────────────────────────────────────────────────────────────
-- Update handle_new_user to apply pre-grants on signup.
--
-- When a user registers, the trigger checks role_pregrants for their email.
-- If a matching row exists, the profile is created with that role and the
-- pre-grant row is deleted (one-time use).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  pregrant_role text;
begin
  -- Check for a pre-assigned role waiting on this email
  select role into pregrant_role
  from public.role_pregrants
  where email = lower(trim(new.email));

  insert into public.user_profiles (id, email, role)
  values (new.id, new.email, coalesce(pregrant_role, 'user'))
  on conflict (id) do nothing;

  -- Consume the pre-grant so it can't apply twice
  if pregrant_role is not null then
    delete from public.role_pregrants
    where email = lower(trim(new.email));
  end if;

  return new;
end;
$$;
