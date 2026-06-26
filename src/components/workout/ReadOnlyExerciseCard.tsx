import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { MuscleGroupColors } from '../../utils/constants';
import { useColors } from '../../utils/useColors';
import PriorityBars from './PriorityBars';

export interface ReadOnlyExercise {
  name: string;
  muscleGroup: string | null;
  musclePriority?: 'emphasize' | 'grow' | 'maintain';
  equipment: string | null;
  note: string | null;
  sets: { weight: number; reps: number; completed: boolean }[];
}

function ReadOnlySetRow({ set }: { set: ReadOnlyExercise['sets'][number] }) {
  const colors = useColors();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      borderRadius: 6,
      marginBottom: 6,
    }}>
      {/* Same width as the dots-vertical button in active SetRow */}
      <View style={{ width: 40 }} />

      {/* Weight */}
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
        <View style={{ backgroundColor: colors.inputBg, width: '100%', maxWidth: 90, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            {set.weight || '0'}
          </Text>
        </View>
      </View>

      {/* Reps */}
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
        <View style={{ backgroundColor: colors.inputBg, width: '100%', maxWidth: 90, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            {set.reps || '0'}
          </Text>
        </View>
      </View>

      {/* LOG checkbox — same size/shape as active, non-pressable */}
      <View style={{ width: 60, alignItems: 'center' }}>
        <View style={{
          width: 30,
          height: 30,
          borderRadius: 6,
          backgroundColor: set.completed ? colors.primary : colors.inputBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {set.completed && <MaterialCommunityIcons name="check" size={18} color="white" />}
        </View>
      </View>
    </View>
  );
}

export default function ReadOnlyExerciseCard({ exercise, musclePriority: priorityProp }: { exercise: ReadOnlyExercise; musclePriority?: 'emphasize' | 'grow' | 'maintain' }) {
  const colors = useColors();
  const badgeColor = MuscleGroupColors[exercise.muscleGroup ?? ''] ?? colors.primary;
  const musclePriority = priorityProp ?? exercise.musclePriority;

  return (
    <View style={{ backgroundColor: colors.cardSurface, borderRadius: 12, marginBottom: 16, overflow: 'hidden', opacity: 0.72 }}>

      {/* Muscle group badge — pixel-for-pixel match of ExerciseCard */}
      {exercise.muscleGroup && (
        <View style={{
          alignSelf: 'flex-start',
          paddingVertical: 4,
          paddingHorizontal: 12,
          borderBottomRightRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: `${badgeColor}50`,
          borderWidth: 1,
          borderColor: `${badgeColor}50`,
        }}>
          {musclePriority
            ? <PriorityBars priority={musclePriority} color={badgeColor} />
            : <MaterialCommunityIcons name="blur-linear" size={12} color={colors.badgeText} style={{ marginRight: 4 }} />
          }
          <Text style={{ color: colors.badgeText, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {exercise.muscleGroup}
          </Text>
        </View>
      )}

      <View style={{ paddingVertical: 10 }}>
        {/* Exercise title row — same as ExerciseCard, no action icons */}
        <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{exercise.name}</Text>
          {exercise.equipment ? (
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{exercise.equipment}</Text>
          ) : null}
        </View>

        {/* Note pill — same as ExerciseCard's pinned note */}
        {exercise.note ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginHorizontal: 16,
            marginBottom: 8,
            backgroundColor: colors.surface2,
            borderRadius: 8,
            padding: 10,
            gap: 8,
          }}>
            <MaterialCommunityIcons name="note-text-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={{ color: colors.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>{exercise.note}</Text>
          </View>
        ) : null}

        {/* Column headers — identical to ExerciseCard */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.surface2, marginBottom: 6 }}>
          <View style={{ width: 40 }} />
          <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>WEIGHT</Text>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>REPS</Text>
          <Text style={{ width: 60, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>LOG</Text>
        </View>

        {/* Set rows */}
        {exercise.sets.map((s, i) => (
          <ReadOnlySetRow key={i} set={s} />
        ))}
      </View>
    </View>
  );
}
