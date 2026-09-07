import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { geminiApiKey, AI_MODEL } from './config';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('shared AI key', () => {
  const original = process.env.GEMINI_API_KEY;
  afterEach(() => { if (original === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original; });

  it('reads the key from a server-only variable', () => {
    process.env.GEMINI_API_KEY = 'test-key';
    expect(geminiApiKey()).toBe('test-key');
  });

  it('fails loudly rather than calling the provider with no credentials', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => geminiApiKey()).toThrow(/not configured/i);
  });

  it('treats a whitespace-only value as unset', () => {
    process.env.GEMINI_API_KEY = '   ';
    expect(() => geminiApiKey()).toThrow();
  });

  it('defaults to Gemini', () => {
    expect(AI_MODEL).toMatch(/^gemini/);
    expect(read('app/api/ai/program/route.ts')).toContain("provider: 'gemini'");
  });

  /**
   * A shared key must never be NEXT_PUBLIC_*: that inlines it into the client
   * bundle, where anyone can read it out of the deployed JavaScript. The whole
   * reason generation moved server-side is to keep it out of the browser.
   */
  it('is never exposed to the client', () => {
    // Match real usage, not the word - the file's own comment explains the rule.
    expect(read('lib/ai/config.ts')).not.toMatch(/process\.env\.NEXT_PUBLIC/);
    for (const file of ['components/ai-program-builder.tsx', 'components/ai-program-review.tsx']) {
      const source = read(file);
      expect(source).not.toContain('GEMINI_API_KEY');
      expect(source).not.toContain('apiKey');
    }
    // The generation request itself must go to our route, not to a provider.
    expect(read('components/ai-program-builder.tsx')).toContain("fetch('/api/ai/program'");
    // ...and the browser is no longer allowed to reach a model provider at all.
    const csp = read('next.config.ts');
    expect(csp).not.toContain('generativelanguage.googleapis.com');
    expect(csp).not.toContain('api.openai.com');
  });

  it('keeps the real key out of the committed example file', () => {
    expect(read('.env.example')).toContain('GEMINI_API_KEY=your-gemini-api-key');
  });
});
