import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { getExerciseSessionHistory, HistorySessionEntry } from '../../api/history';
import { useProfileStore } from '../../store/useProfileStore';
import { Exercise, WorkoutSet } from '../../types/workout';
import { MuscleGroupColors } from '../../utils/constants';
import { useColors } from '../../utils/useColors';
import NoteModal from './NoteModal';
import PriorityBars from './PriorityBars';
import SetRow from './SetRow';

interface ExerciseCardProps {
  exerciseGroup: Exercise[];
  onUpdateSet: (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onAddSet: (exerciseId: string, defaultWeight?: number, rir?: number) => void;
  onExerciseMenuPress: (exerciseId: string) => void;
  onSetMenuPress: (exerciseId: string, setIndex: number) => void;
  onSaveNote: (exerciseId: string, note: string) => void;
  bodyWeight?: number;
}

const MAX_HISTORY_SESSIONS = 5;
const BADGE_HEIGHT = 30;
const BADGE_ABOVE = 10; // 1/3 above card
const BADGE_ON_CARD = 20; // 2/3 on card

function HistoryPanel({ exerciseName }: { exerciseName: string }) {
  const colors = useColors();
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExerciseSessionHistory(exerciseName)
      .then((data) => setSessions(data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [exerciseName]);

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.surface2, borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Loading...</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={{ backgroundColor: colors.surface2, borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          Exercise History
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>No previous data</Text>
      </View>
    );
  }

  const displayed = sessions.slice(0, MAX_HISTORY_SESSIONS);
  const hasMore = sessions.length > MAX_HISTORY_SESSIONS;

  const grouped = new Map<string, HistorySessionEntry[]>();
  displayed.forEach((s) => {
    const key = s.programName ?? 'Quick Workout';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  });

  return (
    <View style={{ backgroundColor: colors.surface2, borderRadius: 8, marginHorizontal: 16, marginBottom: 8, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Exercise History
        </Text>
      </View>

      {Array.from(grouped.entries()).map(([programName, programSessions]) => (
        <View key={programName} style={{ marginBottom: 4 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface2 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
              {programName}
              {programSessions[0]?.programTotalWeeks
                ? ` — ${programSessions[0].programTotalWeeks} wks`
                : ''}
            </Text>
          </View>

          {programSessions.map((session, si) => (
            <View key={si} style={{ paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: si > 0 ? 1 : 0, borderTopColor: colors.surface2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>
                  {session.weekNumber != null && session.dayNumber != null
                    ? `Week ${session.weekNumber} · Day ${session.dayNumber}`
                    : 'Quick Workout'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              {session.sets.map((s, i) => (
                <Text key={i} style={{ color: colors.muted, fontSize: 13, marginBottom: 2 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{s.weight} lbs × {s.reps} reps</Text>
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}

      {hasMore && (
        <Pressable
          onPress={() => router.push('/(tabs)/history' as any)}
          style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
            View full history ({sessions.length} sessions)
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
        </Pressable>
      )}
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
  onSaveNote,
  bodyWeight,
}: ExerciseCardProps) {
  const colors = useColors();
  const theme = useProfileStore((s) => s.theme);
  const primaryMuscle = exerciseGroup[0]?.muscleGroup;
  const musclePriority = exerciseGroup[0]?.musclePriority;
  const badgeColor = primaryMuscle
    ? (MuscleGroupColors[primaryMuscle] ?? colors.primary)
    : colors.primary;

  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [noteExerciseId, setNoteExerciseId] = useState<string | null>(null);

  const toggleHistory = (exerciseId: string) => {
    setHistoryOpen((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

  const noteExercise = noteExerciseId
    ? exerciseGroup.find((ex) => ex.id === noteExerciseId)
    : null;

  const cardInner = (
    <View style={{ paddingBottom: 10, paddingTop: primaryMuscle ? BADGE_ON_CARD + 8 : 10 }}>
      {exerciseGroup.map((exercise, index) => (
        <View key={exercise.id} style={{ marginTop: index > 0 ? 20 : 0, marginBottom: index === exerciseGroup.length - 1 ? 0 : 10 }}>

          {/* Exercise title row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 4 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{exercise.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                {exercise.equipment === 'Bodyweight' && bodyWeight
                  ? `Bodyweight @ ${bodyWeight} lbs`
                  : exercise.equipment || 'Bodyweight'}
              </Text>
            </View>
            <Pressable onPress={() => toggleHistory(exercise.id)} style={{ padding: 6 }}>
              <MaterialCommunityIcons
                name="history"
                size={20}
                color={historyOpen[exercise.id] ? colors.primary : colors.muted}
              />
            </Pressable>
            <Pressable onPress={() => onExerciseMenuPress(exercise.id)} style={{ padding: 6 }}>
              <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Pain warning */}
          {exercise.painWarning ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8, backgroundColor: `${colors.warning}22`, borderRadius: 8, padding: 10, gap: 8 }}>
              <MaterialCommunityIcons name="alert-outline" size={14} color={colors.warning} style={{ marginTop: 1 }} />
              <Text style={{ color: colors.warning, fontSize: 13, flex: 1, lineHeight: 18 }}>{exercise.painWarning}</Text>
            </View>
          ) : null}

          {/* Pinned note */}
          {exercise.note ? (
            <Pressable
              onPress={() => setNoteExerciseId(exercise.id)}
              style={{ flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface2, borderRadius: 8, padding: 10, gap: 8 }}
            >
              <MaterialCommunityIcons name="note-text-outline" size={14} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={{ color: colors.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>{exercise.note}</Text>
            </Pressable>
          ) : null}

          {/* History panel */}
          {historyOpen[exercise.id] && <HistoryPanel exerciseName={exercise.name} />}

          {/* Column headers */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.surface2, marginBottom: 6 }}>
            <View style={{ width: 40 }} />
            <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>WEIGHT</Text>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>REPS</Text>
            <Text style={{ width: 60, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>LOG</Text>
          </View>

          {/* Set rows */}
          {(() => {
            const activeSetIndex = exercise.sets.findIndex((s) => !s.completed && !s.skipped);
            return exercise.sets.map((set, setIndex) => (
              <SetRow
                key={`${exercise.id}-${setIndex}-${set.completed}-${set.skipped}`}
                set={set}
                isActive={setIndex === activeSetIndex}
                onWeightChange={(weight) => onUpdateSet(exercise.id, setIndex, { weight })}
                onRepsChange={(reps) => onUpdateSet(exercise.id, setIndex, { reps })}
                onComplete={(autoReps) => {
                  if (set.skipped) {
                    onUpdateSet(exercise.id, setIndex, { skipped: false, completed: false });
                    return;
                  }
                  if (autoReps !== undefined) {
                    onUpdateSet(exercise.id, setIndex, { reps: autoReps, completed: true });
                  } else {
                    onUpdateSet(exercise.id, setIndex, { completed: !set.completed });
                  }
                }}
                onRemove={() => onRemoveSet(exercise.id, setIndex)}
                onMenuPress={() => onSetMenuPress(exercise.id, setIndex)}
              />
            ));
          })()}

          {/* Add Set */}
          <Pressable
            onPress={() => {
              const isBodyweight = exercise.equipment === 'Bodyweight';
              const lastSet = exercise.sets[exercise.sets.length - 1];
              const defaultWeight = isBodyweight
                ? (bodyWeight ?? lastSet?.weight)
                : lastSet?.weight;
              onAddSet(exercise.id, defaultWeight, lastSet?.rir);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 }}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Add Set</Text>
          </Pressable>

        </View>
      ))}
    </View>
  );

  const cardStyle = {
    borderRadius: 20,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  };

  return (
    <View style={{ marginTop: primaryMuscle ? BADGE_ABOVE : 0, marginBottom: 16 }}>

      {/* Raised muscle group badge — 1/3 above, 2/3 on card */}
      {primaryMuscle && (
        <View style={{
          position: 'absolute',
          top: -BADGE_ABOVE,
          left: 14,
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 11,
          height: BADGE_HEIGHT,
          borderRadius: BADGE_HEIGHT / 2,
          backgroundColor: badgeColor,
          shadowColor: badgeColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.55,
          shadowRadius: 8,
          elevation: 6,
        }}>
          {musclePriority && (
            <PriorityBars priority={musclePriority} color="#FFFFFF" />
          )}
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {primaryMuscle}
          </Text>
        </View>
      )}

      {/* Card body — glass on iOS, solid on Android/web */}
      {Platform.OS === 'ios' ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme={theme === 'dark' ? 'dark' : 'light'}
          tintColor={`${badgeColor}28`}
          style={cardStyle}
        >
          {cardInner}
        </GlassView>
      ) : (
        <View style={[cardStyle, { backgroundColor: colors.cardSurface }]}>
          {cardInner}
        </View>
      )}

      {/* Note modal — outside card so it renders at root level */}
      {noteExercise && (
        <NoteModal
          visible={!!noteExerciseId}
          exerciseName={noteExercise.name}
          initialNote={noteExercise.note ?? ''}
          onClose={() => setNoteExerciseId(null)}
          onSave={(note) => {
            onSaveNote(noteExercise.id, note);
            setNoteExerciseId(null);
          }}
        />
      )}
    </View>
  );
}
