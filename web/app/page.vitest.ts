import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

const { default: Home } = await import('./page');

describe('root route', () => {
  it('redirects to the lightweight Today entry point for fast PWA launch', () => {
    expect(() => Home()).toThrow('REDIRECT:/today');
  });
});
