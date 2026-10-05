import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProfileAvatar } from './profile-avatar';

describe('profile avatar', () => {
  it.each([null, '', '   '])('uses the GRIT icon when the profile image is %j', avatarUrl => {
    const markup = renderToStaticMarkup(createElement(ProfileAvatar, { avatarUrl }));
    expect(markup).toContain('src="/plate-icon.png"');
    expect(markup).toContain('class="native-avatar"');
  });

  it('keeps the user’s own profile image when present', () => {
    const markup = renderToStaticMarkup(createElement(ProfileAvatar, { avatarUrl: 'https://example.com/avatar.png' }));
    expect(markup).toContain('src="https://example.com/avatar.png"');
    expect(markup).not.toContain('/plate-icon.png');
    expect(markup).toContain('referrerPolicy="no-referrer"');
  });
});
