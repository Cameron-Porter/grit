// Re-export from tokens.ts for backward compatibility.
// Prefer importing directly from tokens.ts in new code.
export { DarkTokens as Colors, Themes as ThemeColors, MuscleColors as MuscleGroupColors } from './tokens';
export type { ColorTokens as ThemeColorMap } from './tokens';

export type Theme = 'dark' | 'light';

// Height of the persistent bottom tab bar (base, excluding safe area inset).
export const BOTTOM_TAB_HEIGHT = 76;
