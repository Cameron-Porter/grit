import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Colors } from '../../utils/constants';

type JointPain = 'None' | 'Low' | 'Moderate' | 'A lot';
type Pump = 'Low' | 'Moderate' | 'Amazing';
type Volume = 'Not enough' | 'Just right' | 'Pushed limits' | 'Too much';

interface FeedbackModalProps {
  visible: boolean;
  muscleGroup: string;
  onClose: () => void;
  onSave: (feedback: { jointPain: JointPain; pump: Pump; volume: Volume }) => void;
}

const JOINT_PAIN: JointPain[] = ['None', 'Low', 'Moderate', 'A lot'];
const PUMP: Pump[] = ['Low', 'Moderate', 'Amazing'];
const VOLUME: Volume[] = ['Not enough', 'Just right', 'Pushed limits', 'Too much'];

const jointPainColor = (v: JointPain) => {
  if (v === 'None') return '#22C55E';
  if (v === 'Low') return '#84CC16';
  if (v === 'Moderate') return '#F59E0B';
  return '#EF4444';
};

const pumpColor = (v: Pump) => {
  if (v === 'Low') return Colors.muted;
  if (v === 'Moderate') return Colors.primary;
  return '#2DD4BF';
};

const volumeColor = (v: Volume) => {
  if (v === 'Not enough') return '#F97316';
  if (v === 'Just right') return '#22C55E';
  if (v === 'Pushed limits') return Colors.primary;
  return '#EF4444';
};

export default function FeedbackModal({
  visible,
  muscleGroup,
  onClose,
  onSave,
}: FeedbackModalProps) {
  const [jointPain, setJointPain] = useState<JointPain>('None');
  const [pump, setPump] = useState<Pump>('Moderate');
  const [volume, setVolume] = useState<Volume>('Just right');

  const handleSave = () => {
    onSave({ jointPain, pump, volume });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ backgroundColor: '#1A1F26', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            {/* Title */}
            <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
              How did it go?
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 14, marginBottom: 24 }}>
              {muscleGroup} · Rate this session
            </Text>

            {/* Joint Pain */}
            <FeedbackSection
              label="Joint Pain"
              icon="bone"
              options={JOINT_PAIN}
              selected={jointPain}
              getColor={jointPainColor}
              onSelect={(v) => setJointPain(v as JointPain)}
            />

            {/* Pump */}
            <FeedbackSection
              label="Pump"
              icon="arm-flex"
              options={PUMP}
              selected={pump}
              getColor={pumpColor}
              onSelect={(v) => setPump(v as Pump)}
            />

            {/* Volume */}
            <FeedbackSection
              label="Adequate Volume"
              icon="chart-line"
              options={VOLUME}
              selected={volume}
              getColor={volumeColor}
              onSelect={(v) => setVolume(v as Volume)}
            />

            {/* Actions */}
            <View style={{ marginTop: 8 }}>
              <Pressable
                onPress={handleSave}
                style={{ padding: 16, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 15 }}>Save Feedback</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FeedbackSection({
  label,
  options,
  selected,
  getColor,
  onSelect,
}: {
  label: string;
  icon: string;
  options: string[];
  selected: string;
  getColor: (v: any) => string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const active = opt === selected;
          const color = getColor(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: active ? color : '#333',
                backgroundColor: active ? `${color}22` : 'transparent',
              }}
            >
              <Text style={{ color: active ? color : Colors.muted, fontSize: 14, fontWeight: active ? '700' : '500' }}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
