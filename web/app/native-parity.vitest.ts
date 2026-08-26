import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('native UI parity contracts', () => {
  it('renders the login page with the native wordmark, segmented auth tabs, and social divider', () => {
    const source = read('app/login/page.tsx');
    expect(source).toContain('GritWordmark');
    expect(source).toContain('auth-mode-tabs');
    expect(source).toContain('native-divider');
    expect(source).toContain('Continue with Google');
  });

  it('keeps custom program creation on a native-style create route instead of embedding the wizard in the Programs list', () => {
    const programs = read('app/(app)/programs/page.tsx');
    const create = read('app/(app)/programs/create/page.tsx');
    expect(programs).not.toContain('<GuidedProgramBuilder');
    expect(programs).toContain('href="/programs/create"');
    expect(create).toContain('<GuidedProgramBuilder');
  });

  it('defines native page shell classes used across authenticated pages', () => {
    const css = read('app/globals.css');
    for (const token of ['native-page-header', 'native-section-title', 'native-list-card', 'native-row', 'native-stat-card']) {
      expect(css).toContain(token);
    }
  });

  it('keeps program deletion separate and history exercises vertically stacked', () => {
    const program = read('app/(app)/programs/[id]/page.tsx');
    const history = read('app/(app)/history/[id]/page.tsx');
    expect(program).toContain('className="delete-program-action"');
    expect(history).toContain('history-exercise-card');
    expect(history).toContain('native-exercise-title');
    expect(history).toContain('recovery-feedback-item');
  });

  it('applies preferred equipment to live workout exercise choices', () => {
    const workout = read('app/workout/page.tsx');
    expect(workout).toContain('use_preferred_equipment,preferred_equipment');
    expect(workout.match(/filterExercisesByEquipmentPreference/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('gives exercise and set menus explicit and outside-click dismissal', () => {
    const logger = read('components/workout-logger.tsx');
    expect(logger.match(/className="menu-backdrop"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(logger.match(/className="sheet-close"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(logger).toContain('setMenuDialogRef');
    expect(logger).toMatch(/openFeedback\s*=.*closeWorkoutMenus\(\)/);
  });
});
