import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('PWA manifest', () => {
  it('launches at the static entry route without locking device orientation', () => {
    const value = manifest();

    // '/' paints instantly from cache and routes on to the workout; '/workout'
    // is force-dynamic and left a cold launch on a black screen.
    expect(value.start_url).toBe('/');
    expect(value.orientation).toBeUndefined();
  });

  it('declares a complete standalone Next PWA install contract', () => {
    const value = manifest();

    expect(value.id).toBe('/');
    expect(value.scope).toBe('/');
    expect(value.display).toBe('standalone');
    expect(value.display_override).toContain('window-controls-overlay');
    expect(value.categories).toEqual(expect.arrayContaining(['health', 'fitness', 'productivity']));
    expect(value.shortcuts).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Start workout', url: '/workout' }),
      expect.objectContaining({ name: 'Programs', url: '/programs' }),
    ]));
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', purpose: 'maskable' }),
    ]));
  });
});
