-- Store the newest processed Stripe subscription event so delayed or retried
-- webhook deliveries cannot overwrite newer Stripe billing state.
alter table public.user_profiles
  add column if not exists stripe_subscription_event_created bigint,
  add column if not exists stripe_subscription_event_id text;

comment on column public.user_profiles.stripe_subscription_event_created is
  'Created timestamp of the newest Stripe subscription webhook event applied to this profile; used to ignore older delayed events.';

comment on column public.user_profiles.stripe_subscription_event_id is
  'ID of the newest Stripe subscription webhook event applied to this profile; same-timestamp events use lexical ID order as a deterministic tie-breaker.';

-- Clients may update ordinary profile preferences, but never billing state or
-- webhook-ordering metadata. Those columns are service-role only.
drop policy if exists "users_update_own_profile_no_role_change" on public.user_profiles;
create policy "users_update_own_profile_no_role_change"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select role from public.user_profiles where id = (select auth.uid()))
    and subscription_status = (select subscription_status from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_status = (select stripe_subscription_status from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_event_created is not distinct from (select stripe_subscription_event_created from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_event_id is not distinct from (select stripe_subscription_event_id from public.user_profiles where id = (select auth.uid()))
    and stripe_customer_id is not distinct from (select stripe_customer_id from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_id is not distinct from (select stripe_subscription_id from public.user_profiles where id = (select auth.uid()))
  );
