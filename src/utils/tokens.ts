/**
 * Grit Design Tokens — Stone & Bamboo
 *
 * Three layers:
 *   1. Primitives   — raw hex/number values, never used directly in components
 *   2. Semantic     — intent-named tokens built from primitives
 *   3. Spacing/Type — 8pt grid and typography scale
 *
 * Dark theme variants — change ACTIVE_DARK_VARIANT to switch:
 *   'sumi'   — Option 1: warm charcoal + aged gold (sumi-e ink)
 *   'forest' — Option 2: deep forest green + bamboo
 *   'slate'  — Option 3: cool blue-gray + bamboo
 */

const ACTIVE_DARK_VARIANT: 'sumi' | 'forest' | 'slate' = 'slate';

// ---------------------------------------------------------------------------
// 1. Primitives
// ---------------------------------------------------------------------------

const Palette = {
  black: '#000000',
  white: '#FFFFFF',

  // Ink & warm wood surfaces (light theme + misc)
  ink:       '#0B0907',
  cedar900:  '#1A1510',
  cedar800:  '#26201A',
  cedar700:  '#332B23',
  cedar600:  '#463C30',
  cedar500:  '#5C4E3C',

  // Sumi-e charcoal surfaces
  sumi900:   '#1E1C1A',
  sumi800:   '#282624',
  sumi700:   '#333030',
  sumi600:   '#3E3B38',

  // Deep forest surfaces
  forest900: '#101C14',
  forest800: '#182A1C',
  forest700: '#213825',
  forest600: '#2A4830',

  // Cool slate surfaces
  slate900:  '#14161E',
  slate800:  '#1C1F2C',
  slate700:  '#242838',
  slate600:  '#2E3244',

  // Ivory & parchment (light theme)
  ivory100:  '#F0E8D6',
  ivory200:  '#E4DDD0',
  parchment: '#EEE8DA',
  paper:     '#FAF6EE',

  // Stone neutrals
  stone700:  '#6E6054',
  stone600:  '#8C7C6A',
  stone500:  '#9A8C7E',

  // Bamboo family
  bamboo900: '#1A3D22',
  bamboo700: '#3A7A4A',
  bamboo500: '#6DAA7A',
  bamboo300: '#9ACA9E',
  bamboo100: '#D4EED6',

  // Terracotta — chest/push muscles
  terra700:  '#8B3D1C',
  terra500:  '#B5633A',
  terra300:  '#D4956A',

  // Mountain slate — pull muscles
  mtnSlate700: '#4A6A8A',
  mtnSlate500: '#6A8FAA',
  mtnSlate300: '#9ABCCE',

  // Aged indigo — core/small muscles
  indigo700: '#5A4A6A',
  indigo500: '#7A6A8A',
  indigo300: '#A89AB8',

  // Aged gold — Sumi-e primary + PRs
  gold500:   '#C8A448',
  gold300:   '#E0C878',

  // Semantic
  amber500:  '#C49A3A',
  amber700:  '#A8782A',
  clay500:   '#C4584A',
  clay700:   '#A8442A',
  moss500:   '#5A8C6A',
  moss700:   '#3A8A52',
} as const;

// ---------------------------------------------------------------------------
// 2a. Dark variant — Sumi-e Ink (warm charcoal + aged gold)
// ---------------------------------------------------------------------------

const DarkSumiE = {
  background:  Palette.sumi900,
  surface:     Palette.sumi800,
  surface2:    Palette.sumi700,
  surface3:    Palette.sumi600,
  overlay:     'rgba(0,0,0,0.6)',

  glass:       'rgba(28,26,24,0.88)',
  glassBorder: 'rgba(220,180,80,0.10)',

  text:          Palette.ivory100,
  textSecondary: Palette.stone500,
  textTertiary:  Palette.stone700,
  textInverse:   Palette.sumi900,
  muted:         Palette.stone500,

  primary:    Palette.gold500,
  primaryDim: '#8A6E2C',
  accent:     Palette.gold300,

  success: Palette.moss500,
  warning: Palette.amber500,
  error:   Palette.clay500,
  danger:  Palette.clay500,

  setComplete: Palette.gold500,
  setSkipped:  Palette.stone700,
  setPending:  Palette.sumi800,
  prBadge:     Palette.gold300,
  restTimer:   Palette.gold500,

  border:     'rgba(220,180,80,0.07)',
  separator:  'rgba(220,180,80,0.05)',
  cardBorder: 'rgba(220,180,80,0.09)',

  inputBg:     Palette.sumi700,
  inputBorder: 'rgba(220,180,80,0.12)',
  inputText:   Palette.ivory100,
  placeholder: Palette.stone700,

  tabActive:   Palette.gold500,
  tabInactive: Palette.stone700,
  scrim:       'rgba(0,0,0,0.55)',

  badgeText: Palette.ivory100,

  cardSurface: Palette.sumi800,
  inputBg2:    Palette.sumi600,
} as const;

// Derive the shared type from the canonical variant
export type ColorTokens = typeof DarkSumiE;

// ---------------------------------------------------------------------------
// 2b. Dark variant — Deep Forest (dark green + bamboo)
// ---------------------------------------------------------------------------

const DarkDeepForest: ColorTokens = {
  background:  Palette.forest900,
  surface:     Palette.forest800,
  surface2:    Palette.forest700,
  surface3:    Palette.forest600,
  overlay:     'rgba(0,0,0,0.6)',

  glass:       'rgba(14,26,16,0.88)',
  glassBorder: 'rgba(140,210,150,0.10)',

  text:          '#E8F2E0',
  textSecondary: '#88AE8C',
  textTertiary:  '#527A58',
  textInverse:   Palette.forest900,
  muted:         '#88AE8C',

  primary:    Palette.bamboo300,
  primaryDim: Palette.bamboo500,
  accent:     '#C4E0C8',

  success: Palette.moss500,
  warning: Palette.amber500,
  error:   Palette.clay500,
  danger:  Palette.clay500,

  setComplete: Palette.bamboo500,
  setSkipped:  '#527A58',
  setPending:  Palette.forest800,
  prBadge:     Palette.gold500,
  restTimer:   Palette.bamboo300,

  border:     'rgba(140,210,150,0.07)',
  separator:  'rgba(140,210,150,0.05)',
  cardBorder: 'rgba(140,210,150,0.09)',

  inputBg:     Palette.forest700,
  inputBorder: 'rgba(140,210,150,0.12)',
  inputText:   '#E8F2E0',
  placeholder: '#527A58',

  tabActive:   Palette.bamboo300,
  tabInactive: '#527A58',
  scrim:       'rgba(0,0,0,0.55)',

  badgeText: '#E8F2E0',

  cardSurface: Palette.forest800,
  inputBg2:    Palette.forest600,
};

// ---------------------------------------------------------------------------
// 2c. Dark variant — Cool Slate (blue-gray + bamboo)
// ---------------------------------------------------------------------------

const DarkCoolSlate: ColorTokens = {
  background:  Palette.slate900,
  surface:     Palette.slate800,
  surface2:    Palette.slate700,
  surface3:    Palette.slate600,
  overlay:     'rgba(0,0,0,0.6)',

  glass:       'rgba(18,20,28,0.88)',
  glassBorder: 'rgba(130,150,220,0.10)',

  text:          '#E8EAF2',
  textSecondary: '#8890AA',
  textTertiary:  '#5A6078',
  textInverse:   Palette.slate900,
  muted:         '#8890AA',

  primary:    Palette.bamboo500,
  primaryDim: Palette.bamboo700,
  accent:     Palette.bamboo300,

  success: Palette.moss500,
  warning: Palette.amber500,
  error:   Palette.clay500,
  danger:  Palette.clay500,

  setComplete: Palette.bamboo500,
  setSkipped:  '#5A6078',
  setPending:  Palette.slate800,
  prBadge:     Palette.gold500,
  restTimer:   Palette.bamboo300,

  border:     'rgba(130,150,220,0.07)',
  separator:  'rgba(130,150,220,0.05)',
  cardBorder: 'rgba(130,150,220,0.09)',

  inputBg:     Palette.slate700,
  inputBorder: 'rgba(130,150,220,0.12)',
  inputText:   '#E8EAF2',
  placeholder: '#5A6078',

  tabActive:   Palette.bamboo300,
  tabInactive: '#5A6078',
  scrim:       'rgba(0,0,0,0.55)',

  badgeText: '#E8EAF2',

  cardSurface: Palette.slate800,
  inputBg2:    Palette.slate600,
};

// ---------------------------------------------------------------------------
// 2d. Active dark theme — change ACTIVE_DARK_VARIANT above to switch
// ---------------------------------------------------------------------------

const darkVariants = {
  sumi:   DarkSumiE,
  forest: DarkDeepForest,
  slate:  DarkCoolSlate,
} as const;

export const DarkTokens: ColorTokens = darkVariants[ACTIVE_DARK_VARIANT];

// ---------------------------------------------------------------------------
// 2e. Light theme
// ---------------------------------------------------------------------------

export const LightTokens: ColorTokens = {
  background:  Palette.parchment,
  surface:     Palette.paper,
  surface2:    Palette.ivory200,
  surface3:    '#D8D0C0',
  overlay:     'rgba(26,18,8,0.4)',

  glass:       'rgba(250,246,238,0.85)',
  glassBorder: 'rgba(26,18,8,0.08)',

  text:          '#1A1208',
  textSecondary: Palette.cedar500,
  textTertiary:  Palette.stone600,
  textInverse:   Palette.paper,
  muted:         Palette.cedar500,

  primary:    Palette.moss700,
  primaryDim: Palette.bamboo900,
  accent:     Palette.bamboo500,

  success: Palette.moss700,
  warning: Palette.amber700,
  error:   Palette.clay700,
  danger:  Palette.clay700,

  setComplete: Palette.moss700,
  setSkipped:  Palette.stone600,
  setPending:  Palette.ivory200,
  prBadge:     Palette.amber700,
  restTimer:   Palette.moss700,

  border:     'rgba(26,18,8,0.08)',
  separator:  'rgba(26,18,8,0.06)',
  cardBorder: 'rgba(26,18,8,0.07)',

  inputBg:     Palette.ivory200,
  inputBorder: 'rgba(26,18,8,0.10)',
  inputText:   '#1A1208',
  placeholder: Palette.stone600,

  tabActive:   Palette.moss700,
  tabInactive: Palette.stone600,
  scrim:       'rgba(0,0,0,0.4)',

  badgeText: Palette.paper,

  cardSurface: Palette.paper,
  inputBg2:    '#D8D0C0',
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
  d1:  { fontFamily: FontFamily.display,    fontSize: 36, lineHeight: 40, letterSpacing: -0.5 },
  d2:  { fontFamily: FontFamily.display,    fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  d3:  { fontFamily: FontFamily.displayMed, fontSize: 22, lineHeight: 26, letterSpacing: -0.2 },
  h1:  { fontFamily: FontFamily.bodyBold,   fontSize: 20, lineHeight: 24, letterSpacing: -0.1 },
  h2:  { fontFamily: FontFamily.bodySemi,   fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  h3:  { fontFamily: FontFamily.bodySemi,   fontSize: 15, lineHeight: 20, letterSpacing: 0   },
  b1:  { fontFamily: FontFamily.body,       fontSize: 15, lineHeight: 22, letterSpacing: 0   },
  b2:  { fontFamily: FontFamily.body,       fontSize: 13, lineHeight: 18, letterSpacing: 0   },
  l1:  { fontFamily: FontFamily.bodySemi,   fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  l2:  { fontFamily: FontFamily.bodyMed,    fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },
  cap: { fontFamily: FontFamily.bodySemi,   fontSize: 10, lineHeight: 12, letterSpacing: 1.5 },
} as const;

export type TypeScaleKey = keyof typeof TypeScale;

// ---------------------------------------------------------------------------
// 5. Border radii
// ---------------------------------------------------------------------------

export const Radius = {
  sm:    6,
  md:    10,
  lg:    14,
  xl:    20,
  '2xl': 24,
  pill:  999,
} as const;

// ---------------------------------------------------------------------------
// 6. Shadows (iOS)
// ---------------------------------------------------------------------------

export const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3,  elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8,  elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 8 },
} as const;

// ---------------------------------------------------------------------------
// 7. Muscle group colors — earthy, natural
// ---------------------------------------------------------------------------

export const MuscleColors: Record<string, string> = {
  Back:       '#6A8FAA',   // mountain slate — pull
  Biceps:     '#6A8FAA',
  Forearms:   '#6A8FAA',
  Chest:      '#B5633A',   // terracotta — push
  Shoulders:  '#B5633A',
  Triceps:    '#B5633A',
  Quads:      '#5A8C6A',   // bamboo forest — lower
  Hamstrings: '#5A8C6A',
  Glutes:     '#5A8C6A',
  Traps:      '#7A6A8A',   // aged indigo — core/small
  Calves:     '#7A6A8A',
  Abs:        '#7A6A8A',
};
