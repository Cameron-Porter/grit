-- Stripe is the billing source of truth. These identifiers are written only
-- by the server-side Stripe webhook using the service-role client.
alter table public.user_profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists user_profiles_stripe_customer_id_key on public.user_profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists user_profiles_stripe_subscription_id_key on public.user_profiles (stripe_subscription_id) where stripe_subscription_id is not null;

comment on column public.user_profiles.subscription_status is
  'Billing status controlled by verified Stripe webhook events; never client-writable.';

-- Preserve self-service profile updates without allowing clients to attach
-- their account to arbitrary Stripe records. Only the service-role webhook
-- can change billing status or Stripe identifiers.
drop policy if exists "users_update_own_profile_no_role_change" on public.user_profiles;
create policy "users_update_own_profile_no_role_change"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select role from public.user_profiles where id = (select auth.uid()))
    and subscription_status = (select subscription_status from public.user_profiles where id = (select auth.uid()))
    and stripe_customer_id is not distinct from (select stripe_customer_id from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_id is not distinct from (select stripe_subscription_id from public.user_profiles where id = (select auth.uid()))
  );
