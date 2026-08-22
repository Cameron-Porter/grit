export type StripeSubscriptionEventPointer = {
  stripe_subscription_event_created?: number | null;
  stripe_subscription_event_id?: string | null;
};

export function shouldApplyStripeSubscriptionEvent(
  stored: StripeSubscriptionEventPointer | null | undefined,
  incoming: { created: number; id: string },
) {
  const storedCreated = stored?.stripe_subscription_event_created;
  if (storedCreated === null || storedCreated === undefined) return true;
  if (incoming.created > storedCreated) return true;
  if (incoming.created < storedCreated) return false;
  const storedId = stored?.stripe_subscription_event_id;
  if (!storedId) return true;
  return incoming.id > storedId;
}
