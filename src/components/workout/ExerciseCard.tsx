import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getLastSessionSets } from '../../api/history';
import { Exercise, WorkoutSet } from '../../types/workout';
import { Colors, MuscleGroupColors } from '../../utils/constants';
import SetRow from './SetRow';

interface ExerciseCardProps {
  exerciseGroup: Exercise[];
  onUpdateSet: (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onAddSet: (exerciseId: string) => void;
  onExerciseMenuPress: (exerciseId: string) => void;
  onSetMenuPress: (exerciseId: string, setIndex: number) => void;
}

function HistoryPanel({ exerciseName }: { exerciseName: string }) {
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLastSessionSets(exerciseName)
      .then((data) => setSets(data || []))
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, [exerciseName]);

  return (
    <View style={{ backgroundColor: Colors.surface2, borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        Last Session
      </Text>
      {loading && <Text style={{ color: Colors.muted, fontSize: 13 }}>Loading...</Text>}
      {!loading && sets.length === 0 && (
        <Text style={{ color: Colors.muted, fontSize: 13 }}>No previous data</Text>
      )}
      {!loading && sets.map((s, i) => (
        <Text key={i} style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
          Set {s.set_index + 1}: {s.weight} lbs × {s.reps} reps
        </Text>
      ))}
    </View>
  );
}

export default function ExerciseCard({
  exerciseGroup,
  onUpdateSet,
  onRemoveSet,
  onAddSet,
  onExerciseMenuPress,
  onSetMenuPress,
}: ExerciseCardProps) {
  const primaryMuscle = exerciseGroup[0]?.muscleGroup;
  const badgeColor = primaryMuscle
    ? (MuscleGroupColors[primaryMuscle] ?? Colors.primary)
    : Colors.primary;

  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});

  const toggleHistory = (exerciseId: string) => {
    setHistoryOpen((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

  return (
    <View style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>

      {/* Muscle Group Badge */}
      {primaryMuscle && (
        <View style={{
          alignSelf: 'flex-start',
          paddingVertical: 4,
          paddingHorizontal: 12,
          borderBottomRightRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: `${badgeColor}28`,
        }}>
          <MaterialCommunityIcons name="blur-linear" size={12} color={badgeColor} style={{ marginRight: 4 }} />
          <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {primaryMuscle}
          </Text>
        </View>
      )}

      <View style={{ paddingVertical: 10 }}>
        {exerciseGroup.map((exercise, index) => (
          <View key={exercise.id} style={{ marginTop: index > 0 ? 20 : 6, marginBottom: index === exerciseGroup.length - 1 ? 0 : 10 }}>

            {/* Exercise title row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 10 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>{exercise.name}</Text>
                <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
                  {exercise.equipment || 'Bodyweight'}
                </Text>
              </View>
              {/* History icon */}
              <Pressable onPress={() => toggleHistory(exercise.id)} style={{ padding: 6 }}>
                <MaterialCommunityIcons
                  name="history"
                  size={20}
                  color={historyOpen[exercise.id] ? Colors.primary : Colors.muted}
                />
              </Pressable>
              {/* 3-dot menu */}
              <Pressable onPress={() => onExerciseMenuPress(exercise.id)} style={{ padding: 6 }}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            {/* Last session panel */}
            {historyOpen[exercise.id] && <HistoryPanel exerciseName={exercise.name} />}

            {/* Column headers */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#252525', marginBottom: 6 }}>
              <View style={{ width: 40 }} />
              <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>WEIGHT</Text>
              <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>REPS</Text>
              <Text style={{ width: 60, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>LOG</Text>
            </View>

            {/* Set rows */}
            {exercise.sets.map((set, setIndex) => (
              <SetRow
                key={`${exercise.id}-${setIndex}-${set.completed}`}
                set={set}
                onWeightChange={(weight) => onUpdateSet(exercise.id, setIndex, { weight })}
                onRepsChange={(reps) => onUpdateSet(exercise.id, setIndex, { reps })}
                onToggleComplete={() => onUpdateSet(exercise.id, setIndex, { completed: !set.completed })}
                onRemove={() => onRemoveSet(exercise.id, setIndex)}
                onMenuPress={() => onSetMenuPress(exercise.id, setIndex)}
              />
            ))}

            {/* Add Set */}
            <Pressable onPress={() => onAddSet(exercise.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 }}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}>Add Set</Text>
            </Pressable>

          </View>
        ))}
      </View>
    </View>
  );
}
