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
- soreness "Still sore"→hold/reduce 1 set; "Just in time"→hold/+5lb; "Healed early"/"Not sore"→normal/aggressive
- Multi-session same muscle: assess cumulative fatigue — 2nd session low volume/pump = near recovery limit
- pump "Amazing"→push vol/intensity; pump "Low"→consider swap or reduce
- joint pain "A lot"→-10% weight (round to nearest 5lb); vol "Not enough"→+1 set; vol "Too much"→-1 set
- Weight jumps: upper+5lb, lower+5-10lb (multiples of 5 only); RIR drops 1/wk toward peak

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
