import { Circle, Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
}

export default function Sparkline({
  values,
  width = 72,
  height = 28,
  color = '#14B8A6',
  showDot = true,
}: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 3;

  const xAt = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const yAt = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
    .join(' ');

  // Closed area path for gradient fill
  const areaPath =
    linePath +
    ` L${xAt(values.length - 1).toFixed(1)},${height} L${xAt(0).toFixed(1)},${height} Z`;

  const lastX = xAt(values.length - 1);
  const lastY = yAt(values[values.length - 1]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Area fill */}
      <Path d={areaPath} fill="url(#sg)" />

      {/* Line */}
      <Path d={linePath} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Last-point dot */}
      {showDot && <Circle cx={lastX} cy={lastY} r={2.5} fill={color} />}
    </Svg>
  );
}
