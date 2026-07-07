import { useState } from 'react';
import { Text, View } from 'react-native';
import { useColors } from '../utils/useColors';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  letterColor?: string;
  showTagline?: boolean;
}

const SIZES = {
  sm: { wordmark: 32 },
  md: { wordmark: 52 },
  lg: { wordmark: 72 },
};

export default function GritWordmark({ size = 'md', letterColor, showTagline = true }: Props) {
  const colors = useColors();
  const { wordmark } = SIZES[size];
  const [wordmarkWidth, setWordmarkWidth] = useState(0);
  const gritColor = letterColor ?? colors.text;

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        onLayout={(e) => setWordmarkWidth(e.nativeEvent.layout.width)}
        style={{ fontFamily: 'Inter_900Black', fontSize: wordmark, letterSpacing: -1, lineHeight: wordmark * 1.1 }}
      >
        <Text style={{ color: gritColor }}>G</Text>
        <Text style={{ color: colors.primary }}>.</Text>
        <Text style={{ color: gritColor }}>R</Text>
        <Text style={{ color: colors.primary }}>.</Text>
        <Text style={{ color: gritColor }}>I</Text>
        <Text style={{ color: colors.primary }}>.</Text>
        <Text style={{ color: gritColor }}>T</Text>
        <Text style={{ color: colors.primary }}>.</Text>
      </Text>
      {showTagline && wordmarkWidth > 0 && (
        <View style={{ width: wordmarkWidth, marginTop: 4 }}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.01}
            numberOfLines={1}
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: wordmark * 0.22,
              color: colors.primary,
              letterSpacing: 2,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            Guided Results & Intelligent Training
          </Text>
        </View>
      )}
    </View>
  );
}
