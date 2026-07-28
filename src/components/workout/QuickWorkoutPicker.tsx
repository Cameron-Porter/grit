import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../BottomSheet';
import { useColors } from '../../utils/useColors';
import { useProfileStore } from '../../store/useProfileStore';
import { FontFamily, Radius, Space, TypeScale } from '../../utils/tokens';
import { generateQuickWorkout, QuickWorkoutExercise } from '../../api/quickWorkout';
import {
  isQuickWorkoutSubtypeAvailable,
  QuickWorkoutRegion,
  QuickWorkoutSubtype,
} from '../../rules/quickWorkoutBuilder';

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerated: (label: string, exercises: QuickWorkoutExercise[]) => void;
  // Omit when there's already an active session with exercises loaded (e.g.
  // opened from the in-workout Program menu to replace a scheduled day) —
  // startWorkout() silently no-ops in that case (its own guard checks
  // exercises.length > 0), so the link is hidden rather than offering an
  // action that would appear to do nothing.
  onStartBlank?: () => void;
}

const REGIONS: { value: QuickWorkoutRegion; label: string; icon: string }[] = [
  { value: 'Upper', label: 'Upper', icon: 'arm-flex-outline' },
  { value: 'Lower', label: 'Lower', icon: 'shoe-print' },
  { value: 'FullBody', label: 'Full Body', icon: 'human' },
];

const SUBTYPES: { value: QuickWorkoutSubtype; label: string }[] = [
  { value: 'Push', label: 'Push' },
  { value: 'Pull', label: 'Pull' },
  { value: 'All', label: 'All' },
];

export default function QuickWorkoutPicker({ visible, onClose, onGenerated, onStartBlank }: Props) {
  const colors = useColors();
  const preferredEquipment = useProfileStore((s) => s.preferredEquipment);
  const usePreferredEquipment = useProfileStore((s) => s.usePreferredEquipment);
  const experienceLevel = useProfileStore((s) => s.experienceLevel);

  const [region, setRegion] = useState<QuickWorkoutRegion | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setRegion(null);
    setGenerating(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runGenerate = async (r: QuickWorkoutRegion, subtype: QuickWorkoutSubtype) => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateQuickWorkout(r, subtype, {
        preferredEquipment,
        usePreferredEquipment,
        experienceLevel,
      });
      if (result.exercises.length === 0) {
        setGenerating(false);
        setError('No matching exercises found. Try adjusting your equipment preferences in Settings.');
        return;
      }
      onGenerated(result.sessionLabel, result.exercises);
      reset();
    } catch {
      setGenerating(false);
      setError('Could not generate a workout. Check your connection and try again.');
    }
  };

  // Full Body inherently mixes push and pull, so it skips straight to
  // generation rather than showing a subtype step the user would have to
  // pick 'All' on anyway.
  const handleRegionSelect = (r: QuickWorkoutRegion) => {
    setError(null);
    if (r === 'FullBody') {
      runGenerate(r, 'All');
      return;
    }
    setRegion(r);
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={{ paddingHorizontal: Space[2], paddingBottom: Space[1] }}>
        <Text style={[TypeScale.h3, { color: colors.text, marginBottom: 2 }]}>
          {region ? `${region} — pick a focus` : 'Quick Workout'}
        </Text>
        <Text style={[TypeScale.b2, { color: colors.muted, marginBottom: Space[2] }]}>
          {region
            ? 'Push, pull, or both'
            : "Generate a session from your equipment and today's recent training"}
        </Text>

        {generating ? (
          <View style={{ paddingVertical: Space[4], alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : region === null ? (
          <View style={{ gap: Space[1] }}>
            {REGIONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => handleRegionSelect(r.value)}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: colors.surface2, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[TypeScale.b1, { color: colors.text, fontFamily: FontFamily.bodySemi }]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ gap: Space[1] }}>
            {SUBTYPES.filter((s) => isQuickWorkoutSubtypeAvailable(region, s.value)).map((s) => (
              <Pressable
                key={s.value}
                onPress={() => runGenerate(region, s.value)}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: colors.surface2, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[TypeScale.b1, { color: colors.text, fontFamily: FontFamily.bodySemi }]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setRegion(null)} style={{ paddingVertical: Space[1], alignItems: 'center' }}>
              <Text style={[TypeScale.b2, { color: colors.primary }]}>Back</Text>
            </Pressable>
          </View>
        )}

        {error && (
          <Text style={[TypeScale.b2, { color: colors.error, marginTop: Space[2], textAlign: 'center' }]}>
            {error}
          </Text>
        )}

        {!generating && onStartBlank && (
          <Pressable
            onPress={() => {
              handleClose();
              onStartBlank();
            }}
            style={{ marginTop: Space[2], alignItems: 'center', paddingVertical: Space[1] }}
          >
            <Text style={[TypeScale.b2, { color: colors.muted }]}>Start blank instead</Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
