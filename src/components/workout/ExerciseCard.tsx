import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../utils/constants';
import { Exercise, WorkoutSet } from '../../types/workout';
import SetRow from './SetRow';

interface ExerciseCardProps {
  exerciseGroup: Exercise[];
  onUpdateSet: (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onAddSet: (exerciseId: string) => void;
  onExerciseMenuPress: (exerciseId: string) => void;
  onSetMenuPress: (exerciseId: string, setIndex: number) => void;
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

  return (
    <View style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      
      {/* Muscle Group Title Badge Block (RP Style Top Frame Accent) */}
      {primaryMuscle && (
        <View style={{ backgroundColor: '#8B428A', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="blur-linear" size={12} color="white" style={{ marginRight: 4 }} />
          <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {primaryMuscle}
          </Text>
        </View>
      )}

      <View style={{ paddingVertical: 10 }}>
        {exerciseGroup.map((exercise, index) => (
          <View key={exercise.id} style={{ marginTop: index > 0 ? 20 : 6, marginBottom: index === exerciseGroup.length - 1 ? 0 : 10 }}>
            
            {/* Title Block & Exercise Level Context Menu */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 12 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>{exercise.name}</Text>
                <Text style={{ color: Colors.muted || '#A0A0A0', fontSize: 13, marginTop: 2 }}>
                  {exercise.equipment || 'Bodyweight'}
                </Text>
              </View>
              <Pressable onPress={() => onExerciseMenuPress(exercise.id)} style={{ padding: 2 }}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.text} />
              </Pressable>
            </View>

            {/* Static Grid Table Header Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#252525', marginBottom: 8 }}>
              <View style={{ width: 40 }} />
              <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>WEIGHT</Text>
              <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>REPS</Text>
              <Text style={{ width: 60, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>LOG</Text>
            </View>

            {/* Set List Rendering */}
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

            {/* Append New Set Action Trigger Row */}
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