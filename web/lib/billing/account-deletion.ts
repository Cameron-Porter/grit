type StripeCancellationClient = {
  subscriptions: { cancel: (subscriptionId: string) => Promise<unknown> };
};

const isAlreadyAbsentStripeSubscription = (error: unknown) =>
  Boolean(error && typeof error === 'object' && ('code' in error || 'statusCode' in error) && ((error as { code?: unknown }).code === 'resource_missing' || (error as { statusCode?: unknown }).statusCode === 404));

export async function cancelStripeSubscriptionForAccountDeletion(stripeClient: StripeCancellationClient, subscriptionId: string | null | undefined) {
  if (!subscriptionId) return 'not_needed' as const;
  try {
    await stripeClient.subscriptions.cancel(subscriptionId);
    return 'canceled' as const;
  } catch (error) {
    if (isAlreadyAbsentStripeSubscription(error)) return 'already_absent' as const;
    throw new Error('Stripe subscription cancellation failed.');
  }
}
