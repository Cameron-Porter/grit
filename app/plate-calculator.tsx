import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GradientBackground from '../src/components/GradientBackground';
import { useColors } from '../src/utils/useColors';
import { FontFamily, Radius, Space, TypeScale } from '../src/utils/tokens';

const BAR_WEIGHT = 45; // lbs

// Standard plates in descending order
const PLATE_SIZES = [45, 35, 25, 10, 5, 2.5];

// Color coding common in gym setups
const PLATE_COLORS: Record<number, string> = {
  45:  '#E74C3C', // red
  35:  '#F39C12', // yellow
  25:  '#27AE60', // green
  10:  '#FFFFFF', // white
  5:   '#3498DB', // blue
  2.5: '#9B59B6', // purple
};

function calcPlates(targetWeight: number): { plate: number; count: number }[] {
  const sideWeight = (targetWeight - BAR_WEIGHT) / 2;
  if (sideWeight <= 0) return [];

  const result: { plate: number; count: number }[] = [];
  let remaining = sideWeight;

  for (const plate of PLATE_SIZES) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ plate, count });
      remaining = Math.round((remaining - plate * count) * 10) / 10;
    }
  }

  return result;
}

// Epley estimated 1RM
function epley(weight: number, reps: number) {
  if (reps === 1) return weight;
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

// Common percentages for warmup / working sets
const PERCENTAGES = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];

function PlateBar({ plates }: { plates: { plate: number; count: number }[] }) {
  const colors = useColors();
  if (plates.length === 0) {
    return (
      <View style={[styles.barViz, { backgroundColor: colors.surface2 }]}>
        <Text style={[TypeScale.cap, { color: colors.textTertiary, letterSpacing: 1 }]}>
          ADD WEIGHT ABOVE
        </Text>
      </View>
    );
  }

  const platePairs: number[] = [];
  plates.forEach(({ plate, count }) => {
    for (let i = 0; i < count; i++) platePairs.push(plate);
  });

  return (
    <View style={[styles.barViz, { backgroundColor: colors.surface }]}>
      {/* Bar */}
      <View style={[styles.barShaft, { backgroundColor: colors.textTertiary }]} />
      {/* Collar */}
      <View style={[styles.collar, { backgroundColor: colors.textSecondary }]} />
      {/* Plates */}
      {platePairs.map((plate, i) => {
        const heightPct = Math.min(1, plate / 45);
        const plateH = 20 + heightPct * 60;
        return (
          <View
            key={i}
            style={[
              styles.plate,
              {
                height: plateH,
                backgroundColor: PLATE_COLORS[plate] ?? colors.primary,
              },
            ]}
          >
            <Text style={styles.plateLabel}>{plate}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function PlateCalculator() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [mode, setMode] = useState<'plate' | 'percent'>('plate');

  const targetWeight = parseFloat(weightText) || 0;
  const reps = parseInt(repsText, 10) || 0;
  const plates = calcPlates(targetWeight);
  const totalOnBar = targetWeight > 0 ? `${targetWeight} lbs` : `${BAR_WEIGHT} lbs (bar only)`;

  const oneRM = epley(targetWeight, reps);

  function BackIcon() {
    if (Platform.OS === 'ios') return <SymbolView name="chevron.left" size={20} tintColor={colors.primary} />;
    return <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />;
  }

  return (
    <GradientBackground>
      <View style={{ paddingTop: insets.top + Space[1], paddingHorizontal: Space[2], paddingBottom: Space[1] }}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <BackIcon />
          <Text style={[TypeScale.b1, { color: colors.primary, fontFamily: FontFamily.bodySemi }]}>Back</Text>
        </Pressable>
        <Text style={[TypeScale.d2, { color: colors.text, fontFamily: FontFamily.display, marginTop: Space[1] }]}>
          Plate Calculator
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Space[2], gap: Space[2] }} keyboardShouldPersistTaps="handled">

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.surface2 }]}>
          {(['plate', 'percent'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.modeBtn,
                mode === m && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[TypeScale.l1, { color: mode === m ? '#fff' : colors.textSecondary, fontFamily: FontFamily.bodySemi }]}>
                {m === 'plate' ? 'Plate Calc' : '% of 1RM'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Inputs */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={[TypeScale.cap, { color: colors.textTertiary, letterSpacing: 1, marginBottom: Space['0.5'], textTransform: 'uppercase' }]}>
                {mode === 'percent' ? 'Working Weight (lbs)' : 'Target Weight (lbs)'}
              </Text>
              <TextInput
                value={weightText}
                onChangeText={setWeightText}
                keyboardType="decimal-pad"
                placeholder="135"
                placeholderTextColor={colors.placeholder}
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
              />
            </View>
            {mode === 'percent' && (
              <View style={{ flex: 1 }}>
                <Text style={[TypeScale.cap, { color: colors.textTertiary, letterSpacing: 1, marginBottom: Space['0.5'], textTransform: 'uppercase' }]}>
                  Reps Done
                </Text>
                <TextInput
                  value={repsText}
                  onChangeText={setRepsText}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                />
              </View>
            )}
          </View>
        </View>

        {/* Plate visualization */}
        {mode === 'plate' && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <PlateBar plates={plates} />

            <View style={{ marginTop: Space[2] }}>
              <Text style={[TypeScale.cap, { color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Space[1] }]}>
                Per side ({totalOnBar} total)
              </Text>
              {plates.length === 0 ? (
                <Text style={[TypeScale.b2, { color: colors.textSecondary }]}>Bar only (45 lbs)</Text>
              ) : (
                plates.map(({ plate, count }) => (
                  <View key={plate} style={styles.plateRow}>
                    <View style={[styles.plateDot, { backgroundColor: PLATE_COLORS[plate] ?? colors.primary }]} />
                    <Text style={[TypeScale.h3, { color: colors.text, fontFamily: FontFamily.bodySemi }]}>
                      {count} × {plate} lb
                    </Text>
                    <Text style={[TypeScale.b2, { color: colors.textTertiary }]}>
                      = {count * plate * 2} lbs
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Percentage table */}
        {mode === 'percent' && oneRM > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[TypeScale.cap, { color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Space[1.5] }]}>
              Estimated 1RM: {oneRM} lbs
            </Text>
            {PERCENTAGES.map((pct) => {
              const w = Math.round(oneRM * pct / 2.5) * 2.5;
              const percPlates = calcPlates(w);
              const highlight = pct === 1.0;
              return (
                <View
                  key={pct}
                  style={[
                    styles.percentRow,
                    { borderBottomColor: colors.separator },
                    highlight && { backgroundColor: `${colors.primary}12` },
                  ]}
                >
                  <Text style={[TypeScale.h3, { color: highlight ? colors.primary : colors.text, fontFamily: FontFamily.bodyBold, minWidth: 48 }]}>
                    {Math.round(pct * 100)}%
                  </Text>
                  <Text style={[TypeScale.h3, { color: colors.text, flex: 1 }]}>{w} lbs</Text>
                  <Text style={[TypeScale.b2, { color: colors.textTertiary }]}>
                    {percPlates.map((p) => `${p.count}×${p.plate}`).join('  ')}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Space[1],
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space[2],
  },
  inputRow: {
    flexDirection: 'row',
    gap: Space[1.5],
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Space[1.5],
    paddingVertical: Space[1.5],
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    textAlign: 'center',
  },
  barViz: {
    height: 100,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: Space[2],
    gap: 2,
  },
  barShaft: {
    height: 12,
    flex: 1,
    borderRadius: 6,
  },
  collar: {
    width: 10,
    height: 28,
    borderRadius: 3,
  },
  plate: {
    width: 22,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.6)',
    transform: [{ rotate: '90deg' }],
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[1],
    paddingVertical: Space['0.5'],
  },
  plateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Space['0.5'],
    borderRadius: Radius.sm,
  },
});
