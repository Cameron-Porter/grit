import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.DEV_LOGIN_EMAIL;
const password = process.env.DEV_LOGIN_PASSWORD;

const supabase = createClient(url, key);
await supabase.auth.signInWithPassword({ email, password });

const userId = 'beae078f-3884-4b35-8073-204383d9e675';

// 1. Fetch past workouts for user
const { data: workouts } = await supabase
  .from('workouts')
  .select('id, completed_at, program_day_id')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .order('completed_at', { ascending: false });

console.log(`Total workouts found: ${workouts?.length}`);

const workoutIds = (workouts || []).map(w => w.id);

// 2. Fetch workout sets for Push-Up and Bench Dips
if (workoutIds.length > 0) {
  const { data: sets } = await supabase
    .from('workout_sets')
    .select('workout_id, exercise_name, set_index, weight, reps, reported_rir, completed')
    .in('workout_id', workoutIds)
    .in('exercise_name', ['Push-Up', 'Bench Dips', 'Incline Dumbbell Press', 'Overhead Tricep Extension (Dumbbell)'])
    .order('set_index');

  const workoutMap = new Map(workouts.map(w => [w.id, w.completed_at]));

  console.log('\n=== PAST WORKOUT SETS FOR PUSH-UP & BENCH DIPS ===');
  const grouped = new Map();
  for (const set of (sets || [])) {
    const key = `${set.workout_id}::${set.exercise_name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        workout_id: set.workout_id,
        date: workoutMap.get(set.workout_id),
        exercise_name: set.exercise_name,
        sets: []
      });
    }
    grouped.get(key).sets.push(set);
  }

  for (const entry of Array.from(grouped.values()).sort((a, b) => new Date(b.date) - new Date(a.date))) {
    console.log(`Date: ${entry.date} | Exercise: ${entry.exercise_name} | Total Sets: ${entry.sets.length}`);
    entry.sets.forEach(s => {
      console.log(`   Set ${s.set_index + 1}: ${s.reps} reps @ ${s.weight} lbs (RIR: ${s.reported_rir}, completed: ${s.completed})`);
    });
  }
}

// 3. Inspect program_day_targets for ALL days of Fall Fitness
const { data: fallProgram } = await supabase
  .from('programs')
  .select('id')
  .eq('user_id', userId)
  .eq('is_current', true)
  .single();

if (fallProgram) {
  const { data: days } = await supabase
    .from('program_days')
    .select('id, week_number, day_number, label, completed, skipped')
    .eq('program_id', fallProgram.id)
    .order('week_number')
    .order('day_number');

  console.log('\n=== ALL PROGRAM DAY TARGETS IN FALL FITNESS ===');
  for (const d of (days || [])) {
    const { data: targets } = await supabase
      .from('program_day_targets')
      .select('exercise_name, target_sets, target_reps_min, target_reps_max, target_weight, rir, ai_rationale')
      .eq('program_day_id', d.id);
    if (targets && targets.length > 0) {
      console.log(`Week ${d.week_number} Day ${d.day_number} (${d.label}) [id: ${d.id}, completed: ${d.completed}]:`);
      targets.forEach(t => {
        console.log(`   ${t.exercise_name}: sets=${t.target_sets}, reps=${t.target_reps_min}-${t.target_reps_max}, weight=${t.target_weight}, rir=${t.rir}`);
        console.log(`     rationale: ${t.ai_rationale}`);
      });
    }
  }
}
