import { describe, expect, it } from 'vitest';
import { getCanonicalAppUrl } from './app-url';

describe('canonical app URL', () => {
  it('uses APP_URL before request-origin fallbacks for production OAuth callbacks', () => {
    expect(getCanonicalAppUrl({ APP_URL: 'https://grit.example.com' }, 'https://preview.example.net')).toBe('https://grit.example.com');
  });

  it('normalizes trailing slashes so callback paths are stable', () => {
    expect(getCanonicalAppUrl({ APP_URL: 'https://grit.example.com/' }, 'https://preview.example.net')).toBe('https://grit.example.com');
  });

  it('falls back to the active request origin for localhost and preview environments', () => {
    expect(getCanonicalAppUrl({}, 'http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('throws a clear configuration error when neither APP_URL nor request origin is available', () => {
    expect(() => getCanonicalAppUrl({}, '')).toThrow('APP_URL is not configured');
  });
});
