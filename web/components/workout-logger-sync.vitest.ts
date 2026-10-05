// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkoutLogger, workoutStorageKeys, type WorkoutPrescription } from './workout-logger';

const router = { refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); localStorage.clear(); });

it.each([
  { dayId: null, retry: false, status: 200 },
  { dayId: null, retry: true, status: 200 },
  { dayId: 'day', retry: false, status: 200 },
  { dayId: null, retry: false, status: 500 },
  { dayId: null, retry: true, status: 500 },
  { dayId: null, retry: false, status: 401 },
])('handles saved workout navigation and recovery ($dayId, retry=$retry, status=$status)', async ({ dayId, retry, status }) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let resolveSave!: (response: unknown) => void;
  const saveResponse = new Promise(resolve => { resolveSave = resolve; });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/api/exercises'
    ? { ok: true, json: async () => ({ options: [] }) }
    : saveResponse));
  const workout: WorkoutPrescription = {
    dayId, templateDayId: null, bodyWeight: 185, programName: 'Quick Workout',
    week: null, day: null, label: 'Quick Workout',
    exercises: [{ name: 'Row', muscleGroup: 'Back', musclePriority: null, equipment: 'Cable', sets: 1, repsMin: 8, repsMax: 12, weight: 100, rir: 2 }],
  };
  const { storageKey, queueKey } = workoutStorageKeys('user', dayId);
  localStorage.setItem(storageKey, JSON.stringify({ exercises: workout.exercises, sets: [[{ reps: 8, weight: 100, complete: true, reportedRir: 2 }]] }));
  if (retry) localStorage.setItem(queueKey, JSON.stringify({ workoutId: 'queued-workout' }));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(WorkoutLogger, { workout, userId: 'user' })));
    const finishButton = () => container.querySelector<HTMLButtonElement>('.finish-actions .primary')!;
    if (!retry) await act(async () => finishButton().click());
    expect(finishButton().textContent).toBe('Syncing…');
    expect(finishButton().disabled).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => resolveSave({ ok: status === 200, status, json: async () => status === 200 ? { saved: true } : { error: 'Save failed.' } }));
    if (status === 200) {
      expect(finishButton().textContent).toBe('Workout saved');
      expect(finishButton().disabled).toBe(true);
      expect(localStorage.getItem(queueKey)).toBeNull();
      expect(localStorage.getItem(storageKey)).toBeNull();
      if (dayId === null) expect(router.replace).toHaveBeenCalledWith('/history');
      else expect(router.replace).not.toHaveBeenCalled();
      expect(router.refresh).toHaveBeenCalled();
    } else {
      expect(router.replace).not.toHaveBeenCalled();
      expect(router.refresh).not.toHaveBeenCalled();
      expect(finishButton().disabled).toBe(false);
      expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
      expect(localStorage.getItem(storageKey)).not.toBeNull();
      expect(localStorage.getItem(queueKey) !== null).toBe(status === 500 || status === 401);
    }
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
