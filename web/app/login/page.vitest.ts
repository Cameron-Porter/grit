import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const loginPageSource = readFileSync(resolve(process.cwd(), 'app/login/page.tsx'), 'utf8');

describe('login page OAuth actions', () => {
  it('lets Google sign-in bypass email/password constraint validation', () => {
    expect(loginPageSource).toContain('formAction={signInWithGoogle} formNoValidate');
  });
});

describe('login page Sign Up tab', () => {
  it('renders Sign Up as a real navigable control instead of inert text', () => {
    // A bare `<span>Sign Up</span>` with no href/action is not selectable by
    // click, tap, or keyboard. It must be a Link (or other actionable
    // element) that actually switches the form into signup mode.
    expect(loginPageSource).not.toMatch(/<span[^>]*>\s*Sign Up\s*<\/span>/);
    expect(loginPageSource).toContain('href="/login?mode=signup"');
  });

  it('switches the password field to new-password autocomplete and shows the Create Account action in signup mode', () => {
    expect(loginPageSource).toContain("isSignup ? 'new-password' : 'current-password'");
    expect(loginPageSource).toContain('formAction={signup}');
  });
});
