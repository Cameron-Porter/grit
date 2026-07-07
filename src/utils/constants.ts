export type Theme = 'dark' | 'light';

const DarkColors = {
  background:   '#000000',   // systemGroupedBackground
  surface:      '#1C1C1E',   // secondarySystemGroupedBackground
  surface2:     '#2C2C2E',   // tertiarySystemGroupedBackground
  primary:      '#14B8A6',
  accent:       '#2DD4BF',
  text:         '#FFFFFF',   // label
  muted:        '#8E8E93',   // secondaryLabel
  success:      '#32D74B',   // iOS system green (dark)
  warning:      '#FF9F0A',   // iOS system orange (dark)
  error:        '#FF453A',   // iOS system red (dark)
  cardSurface:  '#1C1C1E',
  inputBg:      '#2C2C2E',   // tertiarySystemGroupedBackground
  badgeText:    '#FFFFFF',
  glass:        'rgba(28,28,30,0.82)',
  glassBorder:  'rgba(255,255,255,0.12)',
  scrim:        'rgba(0,0,0,0.55)',
} as const;

const LightColors = {
  background:   '#F2F2F7',   // systemGroupedBackground
  surface:      '#FFFFFF',   // secondarySystemGroupedBackground
  surface2:     '#E5E5EA',   // systemGray5
  primary:      '#0D9488',
  accent:       '#14B8A6',
  text:         '#000000',   // label
  muted:        '#636366',   // secondaryLabel (rgba(60,60,67,0.6) on white)
  success:      '#34C759',   // iOS system green (light)
  warning:      '#FF9500',   // iOS system orange (light)
  error:        '#FF3B30',   // iOS system red (light)
  cardSurface:  '#FFFFFF',
  inputBg:      '#F2F2F7',   // systemGroupedBackground (recessed in white card)
  badgeText:    '#000000',
  glass:        'rgba(255,255,255,0.72)',
  glassBorder:  'rgba(0,0,0,0.09)',
  scrim:        'rgba(0,0,0,0.4)',
} as const;

export const ThemeColors = { dark: DarkColors, light: LightColors } as const;

// Static fallback used only in non-component contexts (e.g. _layout loading screen).
export const Colors = DarkColors;

// Height of the persistent bottom tab bar (base, excluding safe area inset).
// Add useSafeAreaInsets().bottom where precise device-aware padding is needed.
// 64px pill + 12px gap above safe area
export const BOTTOM_TAB_HEIGHT = 76;

export const MuscleGroupColors: Record<string, string> = {
  // Pull
  Back:       '#24B8D9',
  Biceps:     '#24B8D9',
  Forearms:   '#24B8D9',
  // Push
  Chest:      '#E03EC3',
  Shoulders:  '#E03EC3',
  Triceps:    '#E03EC3',
  // Legs
  Quads:      '#2FB890',
  Hamstrings: '#2FB890',
  Glutes:     '#2FB890',
  // Accessories
  Traps:      '#7C49F0',
  Calves:     '#7C49F0',
  Abs:        '#7C49F0',
};
