import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getNextProgramWorkout } from '../../src/api/programs';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import { Colors, MuscleGroupColors } from '../../src/utils/constants';

export default function Home() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);
  const {
    activeWorkoutId,
    exercises,
    activeProgramName,
    activeProgramWeek,
    activeProgramDayLabel,
    activeProgramDayNumber,
    activeProgramDayId,
  } = useWorkoutStore();

  const [nextWorkout, setNextWorkout] = useState<Awaited<ReturnType<typeof getNextProgramWorkout>>>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0);
  const isActiveProgramWorkout = hasActiveWorkout && !!activeProgramDayId;

  useFocusEffect(
    useCallback(() => {
      if (!hasActiveWorkout) {
        setLoadingNext(true);
        getNextProgramWorkout()
          .then((n) => setNextWorkout(n))
          .catch(() => setNextWorkout(null))
          .finally(() => setLoadingNext(false));
      }
    }, [hasActiveWorkout]),
  );

  const handleStartProgramWorkout = () => {
    if (!nextWorkout) return;
    startFromProgramDay(
      nextWorkout.day.id,
      nextWorkout.program.name,
      nextWorkout.exercises.map((e) => ({
        name: e.exercise_name,
        muscleGroup: e.muscle_group ?? '',
        equipment: e.equipment ?? 'Bodyweight',
        targetSets: e.target_sets,
        targetRepsMin: e.target_reps_min ?? 8,
        targetRepsMax: e.target_reps_max ?? 12,
        targetWeight: e.target_weight ?? 0,
        rir: e.rir ?? undefined,
      })),
      nextWorkout.day.week_number,
      nextWorkout.day.day_number,
      nextWorkout.day.label,
    );
    router.push('/workout');
  };

  const handleStartFreeWorkout = () => {
    startWorkout();
    router.push('/workout');
  };

  const resumeDayLabel = activeProgramDayLabel ?? (activeProgramDayNumber ? `Day ${activeProgramDayNumber}` : 'Workout');
  const resumeSubLabel = activeProgramName
    ? `${activeProgramName}${activeProgramWeek != null ? ` · Week ${activeProgramWeek}` : ''}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          GRIT
        </Text>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>Today's Workout</Text>
        <Text style={{ color: Colors.muted, fontSize: 14, marginTop: 4 }}>
          Guided Results & Intelligent Training
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

        {/* ── Resume active workout ── */}
        {hasActiveWorkout && (
          <Pressable
            onPress={() => router.push('/workout')}
            style={({ pressed }) => ({
              backgroundColor: Colors.surface,
              borderRadius: 14,
              padding: 18,
              borderLeftWidth: 3,
              borderLeftColor: Colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                IN PROGRESS
              </Text>
              <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>
                {resumeDayLabel}
              </Text>
              {resumeSubLabel && (
                <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>{resumeSubLabel}</Text>
              )}
              <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · tap to resume
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.primary} />
          </Pressable>
        )}

        {/* ── UP NEXT program workout ── */}
        {!hasActiveWorkout && nextWorkout && (
          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ backgroundColor: `${Colors.primary}18`, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
              <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                UP NEXT · {nextWorkout.program.name}
              </Text>
              <Text style={{ color: Colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 }}>
                {nextWorkout.day.label ?? `Day ${nextWorkout.day.day_number}`}
                <Text style={{ color: Colors.muted, fontSize: 14, fontWeight: '500' }}>
                  {' '}· Week {nextWorkout.day.week_number}
                </Text>
              </Text>
            </View>

            <View style={{ padding: 12, gap: 6 }}>
              {nextWorkout.exercises.slice(0, 5).map((ex, i) => {
                const color = ex.muscle_group ? (MuscleGroupColors[ex.muscle_group] ?? Colors.muted) : Colors.muted;
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                    <Text style={{ color: Colors.text, fontSize: 14, flex: 1 }}>{ex.exercise_name}</Text>
                    {ex.muscle_group && (
                      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{ex.muscle_group}</Text>
                    )}
                  </View>
                );
              })}
              {nextWorkout.exercises.length > 5 && (
                <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>
                  +{nextWorkout.exercises.length - 5} more
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleStartProgramWorkout}
              style={({ pressed }) => ({
                margin: 12,
                marginTop: 4,
                backgroundColor: Colors.primary,
                borderRadius: 12,
                padding: 15,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <MaterialCommunityIcons name="play" size={20} color={Colors.background} />
              <Text style={{ color: Colors.background, fontSize: 16, fontWeight: '700' }}>Start Workout</Text>
            </Pressable>
          </View>
        )}

        {/* ── No program / all done — only state that shows free workout ── */}
        {!hasActiveWorkout && !loadingNext && !nextWorkout && (
          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 18, alignItems: 'center' }}>
            <MaterialCommunityIcons name="trophy-outline" size={32} color={Colors.primary} style={{ marginBottom: 8 }} />
            <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
              All caught up!
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              All scheduled workouts are complete, or no program is active yet.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <Pressable
                onPress={() => router.push('/programs')}
                style={{ flex: 1, backgroundColor: `${Colors.primary}22`, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary }}
              >
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 14 }}>Programs</Text>
              </Pressable>
              <Pressable
                onPress={handleStartFreeWorkout}
                style={{ flex: 1, backgroundColor: Colors.surface2, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.surface2 }}
              >
                <Text style={{ color: Colors.muted, fontWeight: '700', fontSize: 14 }}>Free Workout</Text>
              </Pressable>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
