'use client';

import type { ExplanationRequest, ExplanationResult } from '@/lib/explanations/types';
import { useDialogFocusTrap } from '@/lib/hooks/use-dialog-focus-trap';
import { useEffect, useRef, useState } from 'react';

export function WorkoutExplanation({ context, onClose }: { context: Omit<ExplanationRequest, 'question'>; onClose: () => void }) {
  const dialog = useRef<HTMLElement | null>(null);
  const pending = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState('Why are these my targets?');
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useDialogFocusTrap(true, dialog);

  useEffect(() => () => pending.current?.abort(), []);

  const ask = async (value: string) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setQuestion(value);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...context, question: value }),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not load this explanation.');
      if (!controller.signal.aborted) setResult(body);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load this explanation.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const repsLabel = context.displayed.repsMin === context.displayed.repsMax
    ? `${context.displayed.repsMax}`
    : `${context.displayed.repsMin}–${context.displayed.repsMax}`;

  return (
    <div className="modal-backdrop confirm-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={dialog}
        tabIndex={-1}
        className="feedback-modal exercise-action-modal workout-explanation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explanation-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
      >
        <header className="sheet-header">
          <div>
            <div className="cap">Target Rationale</div>
            <h2 id="explanation-title">{context.exerciseName}</h2>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close explanation">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="explanation-target-badge">
          <span>{context.displayed.sets} sets</span>
          <span>·</span>
          <span>{repsLabel} reps</span>
          <span>·</span>
          <span>{context.displayed.weight} lb</span>
          <span>·</span>
          <span>{context.displayed.rir} RIR</span>
        </div>

        <form className="note-field" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
          <label htmlFor="explanation-question">Ask about this exercise</label>
          <textarea
            id="explanation-question"
            value={question}
            maxLength={1000}
            rows={3}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask why your reps, weight, or sets were target..."
          />
          <div className="explanation-actions">
            <button className="primary full" disabled={loading || !question.trim()}>
              {loading ? 'Explaining…' : 'Ask G.R.I.T.'}
            </button>
          </div>
        </form>

        <div className="explanation-suggestions" aria-label="Suggested questions">
          <span className="suggestion-label">Suggested:</span>
          <button
            type="button"
            className="secondary suggestion-pill"
            disabled={loading}
            onClick={() => void ask('Why did my reps increase?')}
          >
            Why more reps?
          </button>
          <button
            type="button"
            className="secondary suggestion-pill"
            disabled={loading}
            onClick={() => void ask('Why did my weight stay the same?')}
          >
            Why same weight?
          </button>
        </div>

        {error && <p role="alert" className="notice danger">{error}</p>}

        <div aria-live="polite" aria-busy={loading}>
          {result && (
            <div className="explanation-response-card">
              <div className="response-header">
                <span className="cap">Explanation</span>
                {result.notice && <span className="notice-badge">{result.notice}</span>}
              </div>
              <div className="explanation-answer">
                {result.answer.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              {result.refreshNeeded && (
                <button type="button" className="secondary full" onClick={() => window.location.reload()}>
                  Reload workout targets
                </button>
              )}
              {result.sources.length > 0 && (
                <details className="explanation-sources">
                  <summary tabIndex={0}>Based on ({result.sources.length} sources)</summary>
                  <div className="sources-list">
                    {result.sources
                      .filter((source) => result.citations.includes(source.id))
                      .map((source) => (
                        <article key={source.id} className="source-item">
                          <strong>{source.label}</strong>
                          <p>{source.text}</p>
                        </article>
                      ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
