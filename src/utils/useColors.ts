import { useProfileStore } from '../store/useProfileStore';
import { Themes, ColorTokens } from './tokens';

export function useColors(): ColorTokens {
  const theme = useProfileStore((s) => s.theme);
  return Themes[theme];
}
