export type Theme = 'dark' | 'light';

const DarkColors = {
  background: '#111114',
  surface:    '#1C1C1F',
  surface2:   '#28282C',
  primary:    '#14B8A6',
  accent:     '#2DD4BF',
  text:       '#E5E7EB',
  muted:      '#9CA3AF',
  success:    '#22C55E',
  warning:    '#F59E0B',
  error:      '#EF4444',
} as const;

const LightColors = {
  background: '#FFFFFF',
  surface:    '#F4F4F5',
  surface2:   '#E4E4E7',
  primary:    '#0D9488',
  accent:     '#14B8A6',
  text:       '#0F172A',
  muted:      '#64748B',
  success:    '#16A34A',
  warning:    '#D97706',
  error:      '#DC2626',
} as const;

export const ThemeColors = { dark: DarkColors, light: LightColors } as const;

// Static fallback used only in non-component contexts (e.g. _layout loading screen).
export const Colors = DarkColors;

// Height of the persistent bottom tab bar (base, excluding safe area inset).
// Add useSafeAreaInsets().bottom where precise device-aware padding is needed.
export const BOTTOM_TAB_HEIGHT = 60;

export const MuscleGroupColors: Record<string, string> = {
  // Push — pink / red / amber
  Chest:      '#EC4899',
  Shoulders:  '#EF4444',
  Triceps:    '#EAB308',
  // Pull — teal / blue / purple
  Back:       '#14B8A6',
  Biceps:     '#3B82F6',
  Forearms:   '#A855F7',
  // Lower — green / lime / orange / cyan
  Quads:      '#22C55E',
  Hamstrings: '#84CC16',
  Glutes:     '#F97316',
  Calves:     '#06B6D4',
  // Core
  Abs:        '#8B5CF6',
};
