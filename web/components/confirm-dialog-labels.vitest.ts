import { describe, expect, it } from 'vitest';
import { resolveConfirmLabels } from './confirm-dialog-labels';

describe('standardized confirmation labels', () => {
  it('defaults danger-toned confirmations to Delete/Cancel', () => {
    expect(resolveConfirmLabels({ message: 'x', tone: 'danger' })).toEqual({
      confirmLabel: 'Delete', cancelLabel: 'Cancel', confirmClassName: 'danger',
    });
  });
  it('defaults non-destructive confirmations to Continue/Cancel', () => {
    expect(resolveConfirmLabels({ message: 'x' })).toEqual({
      confirmLabel: 'Continue', cancelLabel: 'Cancel', confirmClassName: 'primary',
    });
  });
  it('lets a call site override either label without changing tone styling', () => {
    expect(resolveConfirmLabels({ message: 'x', tone: 'danger', confirmLabel: 'Remove exercise' })).toEqual({
      confirmLabel: 'Remove exercise', cancelLabel: 'Cancel', confirmClassName: 'danger',
    });
  });
});
