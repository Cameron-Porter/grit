import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getExerciseSessionHistory, HistorySessionEntry } from '../../api/history';
import { getExerciseByName } from '../../data/exerciseDatabase';
import { useProfileStore } from '../../store/useProfileStore';
import { Exercise, WorkoutSet } from '../../types/workout';
import { Badge } from '../Badge';
import { MuscleColors } from '../../utils/tokens';
import { useColors } from '../../utils/useColors';
import { FontFamily, Radius, Shadow, Space, TypeScale } from '../../utils/tokens';
import { classifyVolume } from '../../utils/volumeLandmarks';
import HoldTimerModal from './HoldTimerModal';
import NoteModal from './NoteModal';
import PriorityBars from './PriorityBars';
import SetRow from './SetRow';
import VolumePill from './VolumePill';

interface ExerciseCardProps {
  exerciseGroup: Exercise[];
  onUpdateSet: (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onAddSet: (exerciseId: string, defaultWeight?: number, rir?: number) => void;
  onExerciseMenuPress: (exerciseId: string) => void;
  onSetMenuPress: (exerciseId: string, setIndex: number) => void;
  onSaveNote: (exerciseId: string, note: string) => void;
  bodyWeight?: number;
  weeklySetsByMuscle?: Record<string, number>;
  forceHistoryId?: string;
}

const MAX_HISTORY_SESSIONS = 5;

// Epley formula — estimates 1RM from a working set
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

function Icon({ ios, android, size, color }: { ios: string; android: string; size: number; color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={ios as any} size={size} tintColor={color} />;
  }
  return <MaterialCommunityIcons name={android as any} size={size} color={color} />;
}

function HistoryPanel({ exerciseName }: { exerciseName: string }) {
  const colors = useColors();
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExerciseSessionHistory(exerciseName)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [exerciseName]);

  if (loading) {
    return (
      <View style={[styles.historyShell, { backgroundColor: colors.surface2 }]}>
        <Text style={[TypeScale.cap, { color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }]}>
          Exercise History
        </Text>
        <Text style={[TypeScale.b2, { color: colors.textSecondary }]}>Loading…</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={[styles.historyShell, { backgroundColor: colors.surface2 }]}>
        <Text style={[TypeScale.cap, { color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }]}>
          Exercise History
        </Text>
        <Text style={[TypeScale.b2, { color: colors.textSecondary }]}>No previous data</Text>
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

  // Best estimated 1RM across all displayed sessions
  let best1RM = 0;
  displayed.forEach((s) => {
    s.sets.forEach((set) => {
      const est = epley1RM(set.weight, set.reps);
      if (est > best1RM) best1RM = est;
    });
  });

  return (
    <View style={[styles.historyShell, { backgroundColor: colors.surface2 }]}>
      <View style={styles.historyHeader}>
        <Text style={[TypeScale.cap, { color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' }]}>
          Exercise History
        </Text>
        {best1RM > 0 && (
          <Badge label={`~${best1RM} lbs e1RM`} color={colors.prBadge} variant="tint" size="sm" uppercase={false} />
        )}
      </View>

      {Array.from(grouped.entries()).map(([programName, programSessions]) => (
        <View key={programName} style={{ marginTop: Space['0.5'] }}>
          <Text style={[TypeScale.l1, { color: colors.text, fontFamily: FontFamily.bodySemi, paddingVertical: Space['0.5'] }]}>
            {programName}
            {programSessions[0]?.programTotalWeeks ? ` — ${programSessions[0].programTotalWeeks} wks` : ''}
          </Text>

          {programSessions.map((session, si) => (
            <View key={si} style={[styles.sessionRow, si > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
              <Text style={[TypeScale.l2, { color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                {session.weekNumber != null && session.dayNumber != null
                  ? `Wk ${session.weekNumber} · Day ${session.dayNumber}`
                  : 'Quick Workout'}
              </Text>
              <Text style={[TypeScale.l2, { color: colors.textTertiary }]}>
                {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={{ marginTop: 4, gap: 2 }}>
                {session.sets.map((s, i) => (
                  <Text key={i} style={[TypeScale.b2, { color: colors.textSecondary }]}>
                    <Text style={[TypeScale.b2, { color: colors.text, fontFamily: FontFamily.bodySemi }]}>
                      {s.weight} lbs × {s.reps}
                    </Text>
                    {' '}reps
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}

      {hasMore && (
        <Pressable
          onPress={() => router.push('/(tabs)/history' as any)}
          style={[styles.historyMore, { borderTopColor: colors.separator }]}
        >
          <Text style={[TypeScale.l1, { color: colors.primary, fontFamily: FontFamily.bodySemi }]}>
            View full history ({sessions.length} sessions)
          </Text>
          <Icon ios="chevron.right" android="chevron-right" size={12} color={colors.primary} />
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
  weeklySetsByMuscle,
  forceHistoryId,
}: ExerciseCardProps) {
  const colors = useColors();
  const theme = useProfileStore((s) => s.theme);
  const primaryMuscle = exerciseGroup[0]?.muscleGroup;
  const musclePriority = exerciseGroup[0]?.musclePriority;
  const badgeColor = primaryMuscle ? (MuscleColors[primaryMuscle] ?? colors.primary) : colors.primary;

  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [noteExerciseId, setNoteExerciseId] = useState<string | null>(null);
  const [timerTarget, setTimerTarget] = useState<{ exerciseId: string; setIndex: number } | null>(null);

  useEffect(() => {
    if (forceHistoryId) {
      setHistoryOpen((prev) => ({ ...prev, [forceHistoryId]: true }));
    }
  }, [forceHistoryId]);

  const noteExercise = noteExerciseId ? exerciseGroup.find((ex) => ex.id === noteExerciseId) : null;

  // Best live e1RM across all completed sets in this card
  function get1RM(exercise: Exercise): number {
    let best = 0;
    exercise.sets.forEach((s) => {
      if (s.completed && s.weight > 0 && s.reps > 0) {
        const est = epley1RM(s.weight, s.reps);
        if (est > best) best = est;
      }
    });
    return best;
  }

  const cardInner = (
    <View style={{ paddingBottom: Space[1.5], paddingTop: Space[1.5] }}>
      {primaryMuscle && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: badgeColor }} />
      )}
      {exerciseGroup.map((exercise, index) => {
        const live1RM = get1RM(exercise);
        const muscle = exercise.muscleGroup;
        const weeklySets = muscle && weeklySetsByMuscle ? (weeklySetsByMuscle[muscle] ?? 0) : 0;
        const volumeInfo = muscle ? classifyVolume(muscle, weeklySets) : null;

        const isTimeBased = exercise.logMode === 'time' || getExerciseByName(exercise.name)?.logMode === 'time';

        return (
          <View key={exercise.id}>
            {index > 0 && (
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, marginHorizontal: Space[2], marginTop: Space[2.5], marginBottom: Space[2.5] }} />
            )}

            {/* Muscle group label */}
            {!!exercise.muscleGroup && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Space[2], marginBottom: 3 }}>
                {exercise.musclePriority && <PriorityBars priority={exercise.musclePriority} color={MuscleColors[exercise.muscleGroup] ?? colors.primary} />}
                <Text style={[TypeScale.cap, { color: MuscleColors[exercise.muscleGroup] ?? colors.primary, letterSpacing: 1.2, textTransform: 'uppercase' }]}>
                  {exercise.muscleGroup}
                </Text>
              </View>
            )}

            {/* Title row */}
            <View style={styles.titleRow}>
              <View style={{ flex: 1, paddingRight: Space[1] }}>
                <Text style={[TypeScale.h1, { color: colors.text, fontFamily: FontFamily.displayMed }]}>
                  {exercise.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={[TypeScale.b2, { color: colors.textSecondary }]}>
                    {exercise.equipment === 'Bodyweight' && bodyWeight
                      ? `Bodyweight @ ${bodyWeight} lbs`
                      : exercise.equipment || 'Bodyweight'}
                  </Text>
                  {live1RM > 0 && (
                    <Badge label={`~${live1RM} e1RM`} color={colors.prBadge} variant="tint" size="sm" uppercase={false} />
                  )}
                </View>
                {volumeInfo && weeklySets > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <VolumePill status={volumeInfo.status} label={volumeInfo.label} />
                  </View>
                )}
              </View>
              <Pressable onPress={() => onExerciseMenuPress(exercise.id)} style={styles.iconBtn} hitSlop={8}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {/* Pain warning */}
            {!!exercise.painWarning && (
              <View style={[styles.inlineAlert, { backgroundColor: `${colors.warning}18` }]}>
                <Icon ios="exclamationmark.triangle" android="alert-outline" size={13} color={colors.warning} />
                <Text style={[TypeScale.b2, { color: colors.warning, flex: 1 }]}>{exercise.painWarning}</Text>
              </View>
            )}

            {/* Pinned note */}
            {!!exercise.note && (
              <Pressable
                onPress={() => setNoteExerciseId(exercise.id)}
                style={[styles.inlineAlert, { backgroundColor: colors.surface2 }]}
              >
                <Icon ios="note.text" android="note-text-outline" size={13} color={colors.primary} />
                <Text style={[TypeScale.b2, { color: colors.textSecondary, flex: 1 }]}>{exercise.note}</Text>
              </Pressable>
            )}

            {/* History panel */}
            {historyOpen[exercise.id] && <HistoryPanel exerciseName={exercise.name} />}

            {/* Column headers */}
            <View style={[styles.colHeaders, { borderBottomColor: colors.separator }]}>
              <View style={{ width: 40 }} />
              <Text style={[styles.colLabel, { color: colors.textSecondary }]}>WEIGHT</Text>
              <Text style={[styles.colLabel, { color: colors.textSecondary }]}>{isTimeBased ? 'SECS' : 'REPS'}</Text>
              <Text style={[styles.colLabelRight, { color: colors.textSecondary }]}>LOG</Text>
            </View>

            {/* Set rows */}
            {(() => {
              const activeSetIndex = exercise.sets.findIndex((s) => !s.completed && !s.skipped);
              return exercise.sets.map((set, setIndex) => (
                <SetRow
                  key={`${exercise.id}-${exercise.sets.length}-${setIndex}-${set.completed}-${set.skipped}`}
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
                  onTimerPress={isTimeBased ? () => setTimerTarget({ exerciseId: exercise.id, setIndex }) : undefined}
                />
              ));
            })()}

            {/* Add Set */}
            <Pressable
              onPress={() => {
                const isBodyweight = exercise.equipment === 'Bodyweight';
                const lastSet = exercise.sets[exercise.sets.length - 1];
                const defaultWeight = isBodyweight ? (bodyWeight ?? lastSet?.weight) : lastSet?.weight;
                onAddSet(exercise.id, defaultWeight, lastSet?.rir);
              }}
              style={styles.addSetRow}
            >
              <Icon ios="plus" android="plus" size={14} color={colors.primary} />
              <Text style={[TypeScale.l1, { color: colors.primary, fontFamily: FontFamily.bodySemi }]}>Add Set</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  const cardStyle = [
    styles.card,
    { borderColor: colors.cardBorder },
    Platform.OS !== 'ios' && Shadow.md,
  ];

  return (
    <View style={{ marginBottom: Space[2] }}>

      {/* Card — glass on iOS, elevated surface on Android */}
      {Platform.OS === 'ios' ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme={theme === 'dark' ? 'dark' : 'light'}
          style={cardStyle}
        >
          {cardInner}
        </GlassView>
      ) : (
        <View style={[...cardStyle, { backgroundColor: colors.surface }]}>
          {cardInner}
        </View>
      )}

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

      <HoldTimerModal
        visible={timerTarget !== null}
        onLog={(seconds) => {
          if (timerTarget) {
            onUpdateSet(timerTarget.exerciseId, timerTarget.setIndex, { reps: seconds });
          }
          setTimerTarget(null);
        }}
        onClose={() => setTimerTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Space[2],
    marginBottom: Space['0.5'],
  },
  iconBtn: {
    padding: Space['0.5'],
  },
  inlineAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Space[2],
    marginBottom: Space[1],
    borderRadius: Radius.md,
    padding: Space[1.5],
    gap: Space[1],
  },
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Space['0.5'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Space['0.5'],
  },
  colLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  colLabelRight: {
    width: 64,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[2],
    marginTop: Space[1.5],
    gap: Space['0.5'],
  },
  historyShell: {
    borderRadius: Radius.md,
    padding: Space[1.5],
    marginHorizontal: Space[2],
    marginBottom: Space[1],
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space[1],
  },
  oneRMBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  liveOneRM: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  sessionRow: {
    paddingVertical: Space[1],
  },
  historyMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space['0.5'],
    paddingTop: Space[1],
    marginTop: Space[1],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
