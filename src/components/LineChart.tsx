import { Circle, Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { Text, View } from 'react-native';
import { useColors } from '../utils/useColors';

export interface ChartPoint {
  label: string;
  maxWeight: number;
  maxReps?: number;
  totalVolume?: number;
}

interface LineChartProps {
  data: ChartPoint[];
  width: number;
  height?: number;
  metric?: 'weight' | 'reps';
}

const PAD = { top: 20, right: 16, bottom: 40, left: 50 };

export default function LineChart({ data, width, height = 200, metric = 'weight' }: LineChartProps) {
  const colors = useColors();
  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>No data yet — log some sets to see progress</Text>
      </View>
    );
  }

  const getValue = (d: ChartPoint) => metric === 'reps' ? (d.maxReps ?? 0) : d.maxWeight;

  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;

  const maxV = Math.max(...data.map(getValue));
  const minV = Math.min(...data.map(getValue));

  const xAt = (i: number) =>
    PAD.left + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw);
  const yValue = (v: number) =>
    PAD.top + ch - ((v - minV) / (maxV - minV || 1)) * ch;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yValue(getValue(d)).toFixed(1)}`)
    .join(' ');

  const gridLines = [0, 0.5, 1].map((pct) => ({
    y: PAD.top + ch * (1 - pct),
    label: Math.round(minV + (maxV - minV) * pct).toString(),
  }));

  const step = Math.max(1, Math.ceil(data.length / 5));
  const visibleXLabels = data.reduce<number[]>((acc, _, i) => {
    if (i % step === 0 || i === data.length - 1) acc.push(i);
    return acc;
  }, []);

  return (
    <Svg width={width} height={height}>
      {gridLines.map((g, i) => (
        <Line key={i} x1={PAD.left} y1={g.y} x2={PAD.left + cw} y2={g.y} stroke="#1F2937" strokeWidth={1} />
      ))}

      {gridLines.map((g, i) => (
        <SvgText key={i} x={PAD.left - 6} y={g.y + 4} textAnchor="end" fill={colors.muted} fontSize={10}>
          {g.label}
        </SvgText>
      ))}

      {data.length >= 2 && (
        <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} fill="none" />
      )}

      {data.map((d, i) => (
        <Circle key={i} cx={xAt(i)} cy={yValue(getValue(d))} r={4} fill={colors.primary} />
      ))}

      {data.length <= 8 &&
        data.map((d, i) => (
          <SvgText
            key={i}
            x={xAt(i)}
            y={yValue(getValue(d)) - 8}
            textAnchor="middle"
            fill={colors.primary}
            fontSize={10}
            fontWeight="700"
          >
            {getValue(d)}
          </SvgText>
        ))}

      {visibleXLabels.map((i) => (
        <SvgText key={i} x={xAt(i)} y={height - 8} textAnchor="middle" fill={colors.muted} fontSize={10}>
          {data[i].label}
        </SvgText>
      ))}
    </Svg>
  );
}
