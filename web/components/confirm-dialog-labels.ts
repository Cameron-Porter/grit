export type ConfirmTone = 'default' | 'danger';
export type ConfirmRequest = { message: string; confirmLabel?: string; cancelLabel?: string; tone?: ConfirmTone };

/**
 * One place that decides button wording and styling for every destructive/blocking
 * confirmation in the app, so "Delete" vs "Continue" and danger vs primary styling
 * never drift between call sites (delete account, remove exercise, skip workout, ...).
 */
export const resolveConfirmLabels = (request: ConfirmRequest) => ({
  confirmLabel: request.confirmLabel ?? (request.tone === 'danger' ? 'Delete' : 'Continue'),
  cancelLabel: request.cancelLabel ?? 'Cancel',
  confirmClassName: request.tone === 'danger' ? 'danger' : 'primary',
});
