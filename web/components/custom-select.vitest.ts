import { describe, expect, it } from 'vitest';
import { nextEnabledOptionIndex, type SelectOption } from './custom-select';

const options: SelectOption[] = [
  { value: 'a', label: 'A', disabled: true },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C', disabled: true },
  { value: 'd', label: 'D' },
];

describe('custom select keyboard navigation', () => {
  it('wraps while skipping disabled options', () => {
    expect(nextEnabledOptionIndex(options, 1, 1)).toBe(3);
    expect(nextEnabledOptionIndex(options, 3, 1)).toBe(1);
    expect(nextEnabledOptionIndex(options, 1, -1)).toBe(3);
  });

  it('returns null when no option can be selected', () => {
    expect(nextEnabledOptionIndex([], 0, 1)).toBeNull();
    expect(nextEnabledOptionIndex(options.filter(option => option.disabled), 0, 1)).toBeNull();
  });
});
