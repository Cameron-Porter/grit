import { View } from 'react-native';

export default function PriorityBars({ priority, color }: { priority: 'emphasize' | 'grow' | 'maintain'; color: string }) {
  const filled = priority === 'emphasize' ? 3 : priority === 'grow' ? 2 : 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 6 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{
          width: 3,
          height: 10,
          borderRadius: 1,
          backgroundColor: i <= filled ? color : `${color}30`,
        }} />
      ))}
    </View>
  );
}
