import { describe, expect, it } from 'vitest';
import { appName, contactEmail, legalEntityName, legalUpdatedDate } from './constants';

describe('legal page constants', () => {
  it('are non-empty so /privacy and /terms never render blank contact/attribution info', () => {
    for (const value of [appName, contactEmail, legalEntityName, legalUpdatedDate]) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
  it('exposes a real, checkable contact address', () => {
    expect(contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});
