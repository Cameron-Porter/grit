import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadPickerOptions } from '@/lib/exercises/options';

/**
 * The exercise picker options used to be serialised into the workout page's HTML,
 * which made that document ~123KB against ~21KB for a comparable page. They are
 * only needed once the user opens Replace or Add exercise, so the page ships
 * without them and the client fetches them here after paint.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    return NextResponse.json({ options: await loadPickerOptions(supabase, user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load exercises.' }, { status: 500 });
  }
}
