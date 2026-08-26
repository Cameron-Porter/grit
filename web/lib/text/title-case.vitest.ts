import { describe, expect, it } from 'vitest';
import { titleCase } from './title-case';

describe('titleCase', () => {
  it('formats stored program focus values for display', () => {
    expect(titleCase('hypertrophy')).toBe('Hypertrophy');
    expect(titleCase('general fitness')).toBe('General Fitness');
  });
});
