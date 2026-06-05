const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
}

export interface ExerciseTarget {
  exerciseName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  weightLbs: number;
  rir: number;
}

export interface ProgressiveOverloadTarget extends ExerciseTarget {
  rationale: string;
}

// ── Starter sets ──────────────────────────────────────────────────────────────

export async function generateStarterSets(
  focus: string,
  musclePriorities: Record<string, string>,
  exercises: { name: string; muscleGroup: string; equipment: string }[],
): Promise<ExerciseTarget[]> {
  const priorityLines = Object.entries(musclePriorities)
    .map(([mg, p]) => `  ${mg}: ${p}`)
    .join('\n') || '  (none specified — treat all muscles as Grow)';

  const exerciseLines = exercises
    .map((e) => `  - ${e.name} (${e.muscleGroup}, ${e.equipment})`)
    .join('\n');

  const prompt = `You are an expert hypertrophy coach using RP (Renaissance Periodization) methodology.

Generate week-1 starter sets for a new training program.

Program focus: ${focus}
Muscle priorities:
${priorityLines}

Priority guide:
- Emphasize: max growth, push volume high when the athlete is recovering well (+1–2 sets vs Grow)
- Grow: minimum effective volume for steady growth
- Maintain: just enough to preserve muscle, free up recovery resources (2–3 sets, higher reps 15–20)

Focus rep ranges:
- Hypertrophy: 8–15 reps, moderate load
- Strength: 3–6 reps, heavy load
- General Fitness: 10–15 reps
- Powerbuilding: mix 4–6 heavy + 8–12 hypertrophy sets
- Maintenance: 10–15 reps, lower total sets

Rules:
- Week 1 is always conservative: RIR = 3 (3 reps left in the tank)
- weightLbs = 0 for week 1 (athlete fills in their own working weight)
- sets range: 2–5 per exercise depending on priority

Exercises for this training day:
${exerciseLines}

Return a JSON array ONLY (no markdown, no explanation):
[{"exerciseName":"...","sets":3,"repsMin":8,"repsMax":12,"weightLbs":0,"rir":3}]`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Progressive overload ──────────────────────────────────────────────────────

export interface ExerciseWeeklyData {
  exerciseName: string;
  muscleGroup: string;
  // All sessions that trained this exercise (or same muscle) last week, in day order
  sessions: {
    dayLabel: string;
    sets: { weight: number; reps: number; completed: boolean }[];
    feedback: {
      pump: string | null;
      jointPain: string | null;
      volume: string | null;
      soreness: string | null; // soreness reported at the START of that session
    } | null;
  }[];
}

export async function generateProgressiveOverload(
  focus: string,
  musclePriorities: Record<string, string>,
  weekNumber: number,
  totalWeeks: number,
  exerciseData: ExerciseWeeklyData[],
): Promise<ProgressiveOverloadTarget[]> {
  const targetRir = Math.max(1, 4 - weekNumber);

  const priorityLines = Object.entries(musclePriorities)
    .map(([mg, p]) => `  ${mg}: ${p}`)
    .join('\n') || '  (none specified)';

  const historyLines = exerciseData.map((ex) => {
    const sessionLines = ex.sessions.map((s) => {
      const setStr = s.sets
        .filter((set) => set.completed)
        .map((set) => `${set.weight}lbs × ${set.reps}`)
        .join(', ') || 'no completed sets';
      const fb = s.feedback;
      const fbStr = fb
        ? `pump: ${fb.pump ?? '?'}, joint pain: ${fb.jointPain ?? '?'}, volume: ${fb.volume ?? '?'}, soreness before session: ${fb.soreness ?? 'unknown'}`
        : 'no feedback';
      return `    [${s.dayLabel}] ${setStr} | ${fbStr}`;
    }).join('\n');

    const totalCompletedSets = ex.sessions.reduce(
      (sum, s) => sum + s.sets.filter((set) => set.completed).length, 0,
    );

    return `  ${ex.exerciseName} (${ex.muscleGroup}) — ${ex.sessions.length} session(s) this week, ${totalCompletedSets} total sets:\n${sessionLines}`;
  }).join('\n\n');

  const prompt = `You are an expert hypertrophy coach implementing RP (Renaissance Periodization) progressive overload.

Program focus: ${focus}
Week ${weekNumber} of ${totalWeeks} — target RIR this week: ${targetRir}
Muscle priorities:
${priorityLines}

IMPORTANT: Some muscle groups may have been trained MORE THAN ONCE last week.
Account for total weekly volume and accumulated fatigue when adjusting targets.
A muscle trained twice/week may need more conservative progression or volume management
compared to one trained once — especially if soreness carried into the second session.

Previous week's full training data:
${historyLines}

Adjustment rules:
- Soreness "Still sore" before a session → the muscle hadn't recovered; reduce sets by 1 this week or hold weight
- Soreness "Just in time" → hold weight or small increase (+2.5lbs upper, +5lbs lower)
- Soreness "Healed early" or "Not sore" → normal or aggressive progression
- Multiple sessions same muscle: evaluate cumulative fatigue across both — if second session showed lower volume/pump, the muscle is likely hitting recovery limits
- Pump "Amazing" → muscle responding, can push volume or intensity
- Pump "Low" across sessions → may need swap or volume adjustment
- Joint pain "A lot" → drop weight 10%, note in rationale
- Volume "Not enough" → add 1 set
- Volume "Too much" → drop 1 set
- Typical weight jumps: upper body +2.5–5lbs, lower body +5–10lbs per week
- RIR decreases by 1 each week toward peak week

Return a JSON array ONLY (no markdown, no explanation):
[{"exerciseName":"...","sets":3,"repsMin":8,"repsMax":12,"weightLbs":65,"rir":${targetRir},"rationale":"brief reason"}]`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
