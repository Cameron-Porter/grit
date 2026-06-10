import { useProfileStore } from '../store/useProfileStore';
import { ThemeColors } from './constants';

export function useColors() {
  const theme = useProfileStore((s) => s.theme);
  return ThemeColors[theme];
}
