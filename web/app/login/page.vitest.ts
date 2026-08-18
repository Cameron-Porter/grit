import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const loginPageSource = readFileSync(resolve(process.cwd(), 'app/login/page.tsx'), 'utf8');

describe('login page OAuth actions', () => {
  it('lets Google sign-in bypass email/password constraint validation', () => {
    expect(loginPageSource).toContain('formAction={signInWithGoogle} formNoValidate');
  });
});
