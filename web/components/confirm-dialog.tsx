'use client';

import { useCallback, useRef, useState } from 'react';
import { useDialogFocusTrap } from '@/lib/hooks/use-dialog-focus-trap';
import { resolveConfirmLabels, type ConfirmRequest } from './confirm-dialog-labels';

type PendingConfirm = ConfirmRequest & { resolve: (confirmed: boolean) => void };

/**
 * Renders GRIT's one standardized destructive/blocking confirmation dialog. Call the
 * returned `confirm()` from any client component (`await confirm({ message, tone })`)
 * in place of `window.confirm`; it resolves to the same boolean, but as a themed,
 * keyboard-accessible, focus-trapped dialog instead of the un-stylable native prompt.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useDialogFocusTrap(pending !== null, dialogRef);

  const confirm = useCallback((request: ConfirmRequest) => new Promise<boolean>((resolve) => {
    setPending({ ...request, resolve });
  }), []);

  const settle = (confirmed: boolean) => { pending?.resolve(confirmed); setPending(null); };

  if (!pending) return { confirm, dialog: null };

  const { confirmLabel, cancelLabel, confirmClassName } = resolveConfirmLabels(pending);
  const dialog = (
    <div className="modal-backdrop" role="presentation" onClick={() => settle(false)}>
      <section
        ref={(node) => { dialogRef.current = node; }}
        tabIndex={-1}
        className="feedback-modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-message"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') settle(false); }}
      >
        <p id="confirm-message">{pending.message}</p>
        <div className="modal-actions">
          <button className="quiet" onClick={() => settle(false)}>{cancelLabel}</button>
          <button className={confirmClassName} onClick={() => settle(true)}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );

  return { confirm, dialog };
}
