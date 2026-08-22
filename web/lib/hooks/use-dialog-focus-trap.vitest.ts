// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { trapTabKey } from './use-dialog-focus-trap';

describe('dialog focus trap tab wrapping', () => {
  const [a, b, c] = [
    document.createElement('button'),
    document.createElement('button'),
    document.createElement('button'),
  ];
  const elements = [a, b, c];

  it('wraps forward from the last element to the first', () => {
    expect(trapTabKey(elements, c, false)).toBe(a);
  });

  it('wraps backward from the first element to the last', () => {
    expect(trapTabKey(elements, a, true)).toBe(c);
  });

  it('leaves default behavior alone in the middle of the trap', () => {
    expect(trapTabKey(elements, b, false)).toBeNull();
    expect(trapTabKey(elements, b, true)).toBeNull();
  });

  it('sends focus into the trap when nothing inside is focused', () => {
    const outside = document.createElement('div');
    expect(trapTabKey(elements, outside, false)).toBe(a);
    expect(trapTabKey(elements, outside, true)).toBe(c);
  });

  it('returns null when there is nothing focusable to trap', () => {
    expect(trapTabKey([], a, false)).toBeNull();
  });
});
