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
