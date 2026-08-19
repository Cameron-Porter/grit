-- Separate Stripe billing state from the RevenueCat/shared/native billing
-- state that already lives in subscription_status. The Stripe webhook was
-- writing subscription_status directly, which meant a Stripe cancellation
-- could clobber an active RevenueCat/shared entitlement (and vice versa).
-- Effective access is now the OR of role, subscription_status, and
-- stripe_subscription_status — see web/lib/billing/entitlement.ts.

alter table public.user_profiles
  add column if not exists stripe_subscription_status text
    not null default 'inactive'
    check (stripe_subscription_status in ('active', 'inactive', 'canceled', 'past_due'));

-- Backfill only rows that actually have a Stripe identifier attached; every
-- other row's existing subscription_status reflects RevenueCat/shared/native
-- billing and must not be reinterpreted as a Stripe status.
update public.user_profiles
set stripe_subscription_status = subscription_status
where stripe_customer_id is not null or stripe_subscription_id is not null;

comment on column public.user_profiles.subscription_status is
  'Billing status for RevenueCat/shared/native purchases; never written by the Stripe webhook and never client-writable.';

comment on column public.user_profiles.stripe_subscription_status is
  'Billing status controlled exclusively by verified Stripe webhook events; never client-writable.';

-- Extend the self-update policy so clients cannot write the new Stripe-only
-- column either, matching the existing subscription_status protection.
drop policy if exists "users_update_own_profile_no_role_change" on public.user_profiles;
create policy "users_update_own_profile_no_role_change"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select role from public.user_profiles where id = (select auth.uid()))
    and subscription_status = (select subscription_status from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_status = (select stripe_subscription_status from public.user_profiles where id = (select auth.uid()))
    and stripe_customer_id is not distinct from (select stripe_customer_id from public.user_profiles where id = (select auth.uid()))
    and stripe_subscription_id is not distinct from (select stripe_subscription_id from public.user_profiles where id = (select auth.uid()))
  );
