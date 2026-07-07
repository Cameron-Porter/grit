import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useProfileStore } from '../store/useProfileStore';
import { useColors } from '../utils/useColors';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GradientBackground({ children, style }: Props) {
  const theme = useProfileStore((s) => s.theme);
  const colors = useColors();

  if (theme === 'light') {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
        {children}
      </View>
    );
  }

  // Dark: subtle cool gradient gives glass elements something to sample
  return (
    <LinearGradient
      colors={['#0E0E1A', '#000000']}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 0.6 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
