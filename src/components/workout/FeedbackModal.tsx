import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useColors } from '../../utils/useColors';

type JointPain = 'None' | 'Low' | 'Moderate' | 'A lot';
type Pump = 'Low' | 'Moderate' | 'Amazing';
type Volume = 'Not enough' | 'Just right' | 'Pushed limits' | 'Too much';

interface FeedbackModalProps {
  visible: boolean;
  muscleGroup: string;
  initialFeedback?: { jointPain: string | null; pump: string | null; volume: string | null };
  onClose: () => void;
  onSave: (feedback: { jointPain: string | null; pump: string | null; volume: string | null }) => void;
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

const pumpColor = (v: Pump, primary: string, muted: string) => {
  if (v === 'Low') return muted;
  if (v === 'Moderate') return primary;
  return '#2DD4BF';
};

const volumeColor = (v: Volume, primary: string) => {
  if (v === 'Not enough') return '#F97316';
  if (v === 'Just right') return '#22C55E';
  if (v === 'Pushed limits') return primary;
  return '#EF4444';
};

export default function FeedbackModal({
  visible,
  muscleGroup,
  initialFeedback,
  onClose,
  onSave,
}: FeedbackModalProps) {
  const colors = useColors();
  const [jointPain, setJointPain] = useState<JointPain | null>(null);
  const [pump, setPump] = useState<Pump | null>(null);
  const [volume, setVolume] = useState<Volume | null>(null);

  useEffect(() => {
    if (visible) {
      setJointPain((initialFeedback?.jointPain as JointPain) ?? null);
      setPump((initialFeedback?.pump as Pump) ?? null);
      setVolume((initialFeedback?.volume as Volume) ?? null);
    }
  }, [visible]);

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
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
              How did it go?
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 24 }}>
              {muscleGroup} · Rate this session
            </Text>

            {/* Joint Pain */}
            <FeedbackSection
              label="Joint Pain"
              options={JOINT_PAIN}
              selected={jointPain}
              getColor={(v) => jointPainColor(v as JointPain)}
              mutedColor={colors.muted}
              onSelect={(v) => setJointPain(v as JointPain)}
            />

            {/* Pump */}
            <FeedbackSection
              label="Pump"
              options={PUMP}
              selected={pump}
              getColor={(v) => pumpColor(v as Pump, colors.primary, colors.muted)}
              mutedColor={colors.muted}
              onSelect={(v) => setPump(v as Pump)}
            />

            {/* Volume */}
            <FeedbackSection
              label="Adequate Volume"
              options={VOLUME}
              selected={volume}
              getColor={(v) => volumeColor(v as Volume, colors.primary)}
              mutedColor={colors.muted}
              onSelect={(v) => setVolume(v as Volume)}
            />

            {/* Actions */}
            <View style={{ marginTop: 8 }}>
              <Pressable
                onPress={handleSave}
                style={{ padding: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}
              >
                <Text style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>Save Feedback</Text>
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
  mutedColor,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string | null;
  getColor: (v: any) => string;
  mutedColor: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: mutedColor, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
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
              <Text style={{ color: active ? color : mutedColor, fontSize: 14, fontWeight: active ? '700' : '500' }}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
