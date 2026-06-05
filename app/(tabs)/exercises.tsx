import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Colors } from '../../src/utils/constants';

export default function Exercises() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>Exercises</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="lightning-bolt" size={48} color={Colors.surface2} />
        <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 16 }}>Exercise library</Text>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Coming soon</Text>
      </View>
    </View>
  );
}
