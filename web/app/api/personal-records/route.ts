import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unknownWorkoutExerciseNames } from '@/lib/workout/identity';
import { validateManualPersonalRecordPayload } from '@/lib/personal-records/payload';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!validateManualPersonalRecordPayload(payload)) return NextResponse.json({ error: 'Personal record data is incomplete or invalid.' }, { status: 400 });

  const exerciseName = payload.exerciseName.trim();
  const { data: catalog, error: catalogError } = await supabase.from('exercises').select('name').eq('name', exerciseName);
  if (catalogError) return NextResponse.json({ error: 'Exercise identity could not be verified.' }, { status: 500 });
  const unknownExercises = unknownWorkoutExerciseNames([exerciseName], new Set((catalog ?? []).map((row: { name: string }) => row.name)));
  if (unknownExercises.length) return NextResponse.json({ error: 'That exercise is not in the exercise catalog.' }, { status: 400 });

  const { data, error } = await supabase
    .from('personal_records')
    .upsert(
      { exercise_name: exerciseName, weight: payload.weight, reps: payload.reps, achieved_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: user.id, deleted_at: null },
      { onConflict: 'exercise_name,user_id' },
    )
    .select('id,exercise_name,weight,reps,achieved_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Your personal record could not be saved.' }, { status: 500 });
  return NextResponse.json({ saved: true, record: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'A valid record id is required.' }, { status: 400 });

  const { data, error } = await supabase
    .from('personal_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Your personal record could not be deleted.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Personal record not found.' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
