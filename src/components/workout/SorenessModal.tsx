import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Colors } from '../../utils/constants';

type SorenessLevel = 'Not sore' | 'Healed early' | 'Just in time' | 'Still sore';

interface SorenessModalProps {
  visible: boolean;
  muscleGroup: string;
  onSave: (soreness: SorenessLevel) => void;
}

const SORENESS_LEVELS: { value: SorenessLevel; description: string; color: string }[] = [
  { value: 'Not sore',     description: "Didn't get sore at all",       color: '#22C55E' },
  { value: 'Healed early', description: 'Recovered well before today',   color: '#84CC16' },
  { value: 'Just in time', description: 'Recovered right before today',  color: '#2DD4BF' },
  { value: 'Still sore',   description: "Haven't fully recovered yet",   color: '#EF4444' },
];

export default function SorenessModal({ visible, muscleGroup, onSave }: SorenessModalProps) {
  const [selected, setSelected] = useState<SorenessLevel>('Not sore');

  const handleSave = () => {
    onSave(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleSave}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ backgroundColor: '#1A1F26', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            {/* Title */}
            <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
              How's your soreness?
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 14, marginBottom: 24 }}>
              {muscleGroup} · Since your last session
            </Text>

            {/* Options */}
            <View style={{ gap: 10, marginBottom: 28 }}>
              {SORENESS_LEVELS.map(({ value, description, color }) => {
                const active = selected === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setSelected(value)}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? color : '#333',
                      backgroundColor: active ? `${color}18` : 'transparent',
                      padding: 14,
                    }}
                  >
                    <Text style={{ color: active ? color : Colors.text, fontSize: 15, fontWeight: active ? '700' : '500' }}>
                      {value}
                    </Text>
                    <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>
                      {description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleSave}
              style={{ padding: 16, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 15 }}>Save</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
