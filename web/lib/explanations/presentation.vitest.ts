import { expect, it } from 'vitest';
import { presentSources } from './presentation';

it('returns readable cited facts without source files, code excerpts, or raw gates', () => {
  const sources = presentSources([
    { id: 'rule:1', label: 'HV-028 · src/rules/progressionEngine.ts:291', text: 'function nextWeight() {}', file: 'src/rules/progressionEngine.ts', line: 291 },
    { id: 'rule:2', label: 'Another rule', text: 'internal code' },
    { id: 'gates', label: 'Internal gates', text: '{"private":"details"}' },
    { id: 'rep-plan', label: 'Rep targets', text: 'internal algorithm', displayText: 'Last workout: 20, 20, 20 reps.' },
  ], ['rule:1', 'rule:2', 'gates', 'rep-plan']);
  expect(sources).toHaveLength(2);
  expect(sources[1].text).toBe('Last workout: 20, 20, 20 reps.');
  expect(JSON.stringify(sources)).not.toMatch(/src\/|function|HV-028|private|internal/);
});
