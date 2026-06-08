const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

async function callGemini(prompt: string): Promise<string> {
  const key = (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '').trim();
  if (!key) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  return text;
}

// Persona matched to program focus for domain-appropriate coaching voice
function getPersona(focus: string): string {
  switch (focus) {
    case 'hypertrophy':
      return 'You are an elite IFBB pro bodybuilding coach with 20+ years specializing in maximum hypertrophy using RP methodology.';
    case 'strength':
      return 'You are a head strength & conditioning coach with 20+ years training Olympic weightlifters and elite powerlifters.';
    case 'powerbuilding':
      return 'You are a top-tier powerbuilding coach who programs for competitive powerlifters who also train for maximum muscle size.';
    case 'general':
      return 'You are a head CrossFit affiliate coach and certified S&C specialist focused on well-rounded athleticism and functional fitness.';
    case 'maintenance':
      return 'You are a veteran sports scientist and S&C coach specializing in muscle preservation, injury prevention, and training longevity.';
    default:
      return 'You are an expert certified strength & conditioning specialist (CSCS) and personal trainer.';
  }
}

// Compact priority string: "Chest:emphasize,Back:grow"
function priorityStr(p: Record<string, string>): string {
  const entries = Object.entries(p);
  return entries.length ? entries.map(([m, v]) => `${m}:${v}`).join(',') : 'all:grow';
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface SplitDay {
  dayIndex: number;
  splitName: string;
  exercises: { name: string; muscleGroup: string; equipment: string }[];
}

export interface ExerciseWeeklyData {
  exerciseName: string;
  muscleGroup: string;
  sessions: {
    dayLabel: string;
    sets: { weight: number; reps: number; completed: boolean }[];
    feedback: {
      pump: string | null;
      jointPain: string | null;
      volume: string | null;
      soreness: string | null;
    } | null;
  }[];
}

// ── Workout split ─────────────────────────────────────────────────────────────

export async function generateWorkoutSplit(
  focus: string,
  musclePriorities: Record<string, string>,
  daysPerWeek: number,
  dayLabels: string[],
): Promise<SplitDay[]> {
  const repRange =
    focus === 'strength' ? '3-6' :
    focus === 'powerbuilding' ? '4-6 + 8-12 mix' :
    focus === 'general' ? '10-15' : '8-15';

  const prompt =
`${getPersona(focus)}

Design a ${daysPerWeek}-day training split for: ${dayLabels.join(', ')}.
Focus:${focus} | Priorities:${priorityStr(musclePriorities)}
Rep target:${repRange}

Rules:
- Best-fit split for ${daysPerWeek} days (PPL/UL/FB/etc.)
- emphasize=more days+exercises; maintain=1-2 ex,15-20 reps; grow=standard MEV
- 4-6 exercises/day; equipment: Barbell/Dumbbells/Cable/Machine/Bodyweight
- No same muscle consecutive days when avoidable
- Common exercise names (e.g."Barbell Bench Press","Lat Pulldown")
- EXERCISE ORDER within each day (strictly follow to prevent injury):
  1. Compound multi-joint first (squat/deadlift/bench/row/press)
  2. Secondary compounds second (incline press/RDL/pulldown)
  3. Isolation movements last (curls/lateral raises/flyes/extensions)
  4. Never pre-fatigue a stabilizer before its primary compound (e.g. no lateral raises before overhead press, no flyes before bench, no leg curls before RDL)
  5. Chest before triceps; Back before biceps; Quads before hamstrings; Shoulders last on push days

JSON only, no markdown:
[{"dayIndex":0,"splitName":"Push","exercises":[{"name":"Barbell Bench Press","muscleGroup":"Chest","equipment":"Barbell"}]}]
dayIndex is 0-based matching the day order above.`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    throw e;
  }
}

// ── Starter sets ──────────────────────────────────────────────────────────────

export async function generateStarterSets(
  focus: string,
  musclePriorities: Record<string, string>,
  exercises: { name: string; muscleGroup: string; equipment: string }[],
): Promise<ExerciseTarget[]> {
  const repRange =
    focus === 'strength' ? '3-6' :
    focus === 'powerbuilding' ? 'heavy:4-6+hypertrophy:8-12' :
    focus === 'general' || focus === 'maintenance' ? '10-15' : '8-15';

  const exList = exercises.map((e) => `${e.name}(${e.muscleGroup},${e.equipment})`).join('; ');

  const prompt =
`${getPersona(focus)}

Week-1 starter sets. Focus:${focus} | Priorities:${priorityStr(musclePriorities)}

MANDATORY set counts — never go below these minimums:
- emphasize: MINIMUM 4 sets, target 5 sets (high priority muscle, maximize stimulus)
- grow: MINIMUM 3 sets, target 4 sets (standard hypertrophy volume)
- maintain: MINIMUM 2 sets, maximum 3 sets (preservation only)
- default (unspecified): MINIMUM 3 sets

Reps:${repRange} | All week-1: RIR=3, weightLbs=0 (athlete fills their own working weight)

Exercises (muscle group determines priority from the list above): ${exList}

JSON only:
[{"exerciseName":"...","sets":4,"repsMin":8,"repsMax":12,"weightLbs":0,"rir":3}]`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    throw e;
  }
}

// ── Progressive overload ──────────────────────────────────────────────────────

export async function generateProgressiveOverload(
  focus: string,
  musclePriorities: Record<string, string>,
  weekNumber: number,
  totalWeeks: number,
  exerciseData: ExerciseWeeklyData[],
): Promise<ProgressiveOverloadTarget[]> {
  const targetRir = Math.max(1, 4 - weekNumber);

  const history = exerciseData.map((ex) => {
    const sessions = ex.sessions.map((s) => {
      const sets = s.sets.filter((x) => x.completed).map((x) => `${x.weight}×${x.reps}`).join(',') || 'none';
      const fb = s.feedback;
      const fbStr = fb
        ? `pump:${fb.pump??'?'} pain:${fb.jointPain??'?'} vol:${fb.volume??'?'} soreness:${fb.soreness??'?'}`
        : 'no feedback';
      return `[${s.dayLabel}] ${sets} | ${fbStr}`;
    }).join(' / ');
    const totalSets = ex.sessions.reduce((n, s) => n + s.sets.filter((x) => x.completed).length, 0);
    return `${ex.exerciseName}(${ex.muscleGroup}) ${ex.sessions.length}sess/${totalSets}sets: ${sessions}`;
  }).join('\n');

  const prompt =
`${getPersona(focus)}

Wk${weekNumber}/${totalWeeks}, target RIR:${targetRir}. Focus:${focus} | Priorities:${priorityStr(musclePriorities)}

Last week:
${history}

Adjustment logic:
- soreness "Still sore"→hold/reduce 1 set; "Just in time"→hold/+2.5lb; "Healed early"/"Not sore"→normal/aggressive
- Multi-session same muscle: assess cumulative fatigue — 2nd session low volume/pump = near recovery limit
- pump "Amazing"→push vol/intensity; pump "Low"→consider swap or reduce
- joint pain "A lot"→-10% weight; vol "Not enough"→+1 set; vol "Too much"→-1 set
- Weight jumps: upper+2.5-5lb, lower+5-10lb; RIR drops 1/wk toward peak

JSON only:
[{"exerciseName":"...","sets":3,"repsMin":8,"repsMax":12,"weightLbs":65,"rir":${targetRir},"rationale":"..."}]`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    throw e;
  }
}
