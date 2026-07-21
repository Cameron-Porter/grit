/**
 * Grit Design Tokens
 *
 * Three layers:
 *   1. Primitives   — raw hex/number values, never used directly in components
 *   2. Semantic     — intent-named tokens built from primitives (background, setComplete, danger…)
 *   3. Spacing/Type — 8pt grid and typography scale
 */

// ---------------------------------------------------------------------------
// 1. Primitives
// ---------------------------------------------------------------------------

const Palette = {
  black:       '#000000',
  grey950:     '#0A0A0A',
  grey900:     '#111111',
  grey800:     '#1C1C1E',
  grey700:     '#2C2C2E',
  grey600:     '#3A3A3C',
  grey500:     '#48484A',
  grey400:     '#636366',
  grey300:     '#8E8E93',
  grey200:     '#AEAEB2',
  grey100:     '#E5E5EA',
  white:       '#FFFFFF',

  // Primary teal family
  teal900:     '#0D3D38',
  teal700:     '#0D9488',
  teal500:     '#14B8A6',
  teal300:     '#2DD4BF',
  teal100:     '#CCFBF1',

  // System semantic
  green:       '#32D74B',
  greenLight:  '#34C759',
  orange:      '#FF9F0A',
  orangeLight: '#FF9500',
  red:         '#FF453A',
  redLight:    '#FF3B30',

  // Muscle group family — kept as primitives, referenced by MuscleColors
  blue:        '#24B8D9',
  pink:        '#E03EC3',
  emerald:     '#2FB890',
  violet:      '#7C49F0',
} as const;

// ---------------------------------------------------------------------------
// 2. Semantic tokens (dark theme)
// ---------------------------------------------------------------------------

export const DarkTokens = {
  // Surfaces — micro blue-tint makes teal accents feel intentional
  background:    Palette.black,
  surface:       '#1C1C22',          // card, sheet
  surface2:      '#2A2A32',          // nested card, input bg
  surface3:      '#383840',          // pressed / active state
  overlay:       'rgba(0,0,0,0.6)',

  // Glass (blur overlays)
  glass:         'rgba(28,28,34,0.82)',
  glassBorder:   'rgba(255,255,255,0.13)',

  // Text
  text:          Palette.white,
  textSecondary: Palette.grey300,
  textTertiary:  Palette.grey400,
  textInverse:   Palette.black,
  muted:         Palette.grey300,   // alias → textSecondary

  // Brand
  primary:       Palette.teal500,
  primaryDim:    Palette.teal700,
  accent:        Palette.teal300,

  // Semantic states
  success:       Palette.green,
  warning:       Palette.orange,
  error:         Palette.red,
  danger:        Palette.red,

  // Workout-specific semantic
  setComplete:   Palette.teal500,
  setSkipped:    Palette.grey400,
  setPending:    '#2A2A32',
  prBadge:       Palette.orange,
  restTimer:     Palette.teal300,

  // Borders & separators
  border:        'rgba(255,255,255,0.08)',
  separator:     'rgba(255,255,255,0.06)',
  cardBorder:    'rgba(255,255,255,0.09)',

  // Inputs
  inputBg:       '#2A2A32',
  inputBorder:   'rgba(255,255,255,0.13)',
  inputText:     Palette.white,
  placeholder:   Palette.grey400,

  // Navigation
  tabActive:     Palette.teal300,
  tabInactive:   Palette.grey400,
  scrim:         'rgba(0,0,0,0.55)',

  // Badge
  badgeText:     Palette.white,

  // Backward-compat aliases
  surface2:      '#2A2A32',
  cardSurface:   '#1C1C22',
  inputBg2:      '#383840',
} as const;

export type ColorTokens = typeof DarkTokens;

export const LightTokens: ColorTokens = {
  background:    '#F2F2F7',
  surface:       Palette.white,
  surface2:      '#F2F2F7',
  surface3:      '#E5E5EA',
  overlay:       'rgba(0,0,0,0.4)',

  glass:         'rgba(255,255,255,0.72)',
  glassBorder:   'rgba(0,0,0,0.08)',

  text:          Palette.black,
  textSecondary: '#636366',
  textTertiary:  '#8E8E93',
  textInverse:   Palette.white,
  muted:         '#636366',

  primary:       Palette.teal700,
  primaryDim:    Palette.teal900,
  accent:        Palette.teal500,

  success:       Palette.greenLight,
  warning:       Palette.orangeLight,
  error:         Palette.redLight,
  danger:        Palette.redLight,

  setComplete:   Palette.teal700,
  setSkipped:    '#8E8E93',
  setPending:    '#E5E5EA',
  prBadge:       Palette.orangeLight,
  restTimer:     Palette.teal700,

  border:        'rgba(0,0,0,0.08)',
  separator:     'rgba(0,0,0,0.06)',
  cardBorder:    'rgba(0,0,0,0.07)',

  inputBg:       '#F2F2F7',
  inputBorder:   'rgba(0,0,0,0.10)',
  inputText:     Palette.black,
  placeholder:   '#8E8E93',

  tabActive:     Palette.teal700,
  tabInactive:   '#636366',
  scrim:         'rgba(0,0,0,0.4)',

  badgeText:     Palette.white,

  // Backward-compat aliases
  surface2:      '#E5E5EA',
  cardSurface:   Palette.white,
  inputBg2:      '#E5E5EA',
};

export const Themes = { dark: DarkTokens, light: LightTokens } as const;

// ---------------------------------------------------------------------------
// 3. Spacing — strict 8pt grid
// ---------------------------------------------------------------------------

export const Space = {
  px:  1,
  0.5: 4,
  1:   8,
  1.5: 12,
  2:   16,
  2.5: 20,
  3:   24,
  4:   32,
  5:   40,
  6:   48,
  8:   64,
  10:  80,
} as const;

// ---------------------------------------------------------------------------
// 4. Typography scale
// ---------------------------------------------------------------------------

export const FontFamily = {
  display:    'PlusJakartaSans_800ExtraBold',
  displayMed: 'PlusJakartaSans_600SemiBold',
  body:       'Inter_400Regular',
  bodyMed:    'Inter_500Medium',
  bodySemi:   'Inter_600SemiBold',
  bodyBold:   'Inter_700Bold',
  bodyBlack:  'Inter_900Black',
} as const;

export const TypeScale = {
  // Display — workout titles, PR numbers, big stats
  d1: { fontFamily: FontFamily.display,    fontSize: 36, lineHeight: 40, letterSpacing: -0.5 },
  d2: { fontFamily: FontFamily.display,    fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  d3: { fontFamily: FontFamily.displayMed, fontSize: 22, lineHeight: 26, letterSpacing: -0.2 },

  // Headings — section titles, card headers
  h1: { fontFamily: FontFamily.bodyBold,   fontSize: 20, lineHeight: 24, letterSpacing: -0.1 },
  h2: { fontFamily: FontFamily.bodySemi,   fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  h3: { fontFamily: FontFamily.bodySemi,   fontSize: 15, lineHeight: 20, letterSpacing: 0 },

  // Body — descriptions, notes
  b1: { fontFamily: FontFamily.body,       fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  b2: { fontFamily: FontFamily.body,       fontSize: 13, lineHeight: 18, letterSpacing: 0 },

  // Labels — chips, tags, metadata
  l1: { fontFamily: FontFamily.bodySemi,   fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  l2: { fontFamily: FontFamily.bodyMed,    fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },

  // Caps — eyebrow labels (uppercase applied separately)
  cap: { fontFamily: FontFamily.bodySemi, fontSize: 10, lineHeight: 12, letterSpacing: 1.5 },
} as const;

export type TypeScaleKey = keyof typeof TypeScale;

// ---------------------------------------------------------------------------
// 5. Border radii
// ---------------------------------------------------------------------------

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  '2xl': 24,
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// 6. Shadows (iOS)
// ---------------------------------------------------------------------------

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ---------------------------------------------------------------------------
// 7. Muscle group colors (unchanged, re-exported from here)
// ---------------------------------------------------------------------------

export const MuscleColors: Record<string, string> = {
  Back:       Palette.blue,
  Biceps:     Palette.blue,
  Forearms:   Palette.blue,
  Chest:      Palette.pink,
  Shoulders:  Palette.pink,
  Triceps:    Palette.pink,
  Quads:      Palette.emerald,
  Hamstrings: Palette.emerald,
  Glutes:     Palette.emerald,
  Traps:      Palette.violet,
  Calves:     Palette.violet,
  Abs:        Palette.violet,
};
