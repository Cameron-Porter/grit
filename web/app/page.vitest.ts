import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

const { default: Home } = await import('./page');

describe('root route', () => {
  it('redirects to the authenticated dashboard entry point', () => {
    expect(() => Home()).toThrow('REDIRECT:/dashboard');
  });
});
