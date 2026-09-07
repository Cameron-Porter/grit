import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requestStructuredProgram } from '@/lib/ai/providers';
import { AI_MODEL, geminiApiKey } from '@/lib/ai/config';
import { AI_PROGRAM_SCHEMA, buildAiProgramBase, buildAiPrompt, type AiBuilderInput, type AiCatalogExercise } from '@/lib/ai/program';

type Body = { input?: AiBuilderInput; catalog?: AiCatalogExercise[]; history?: { exerciseName: string; uses: number; lastWeight: number | null }[] };

/**
 * Generation used to run in the browser with the user's own API key. It now uses
 * one shared server-held key, so the request has to happen here - a shared key
 * sent to the client would be readable by anyone who opens the bundle.
 *
 * The prompt is assembled server-side from the submitted choices rather than
 * accepted as free text, so this cannot be driven as a general-purpose model
 * proxy on the shared quota. It is also behind the same auth guard as the rest
 * of the app.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  let body: Body;
  try { body = await request.json() as Body; }
  catch { return NextResponse.json({ error: 'Could not read the generation request.' }, { status: 400 }); }

  const { input, catalog, history } = body;
  if (!input || !Array.isArray(catalog) || !Array.isArray(history)) {
    return NextResponse.json({ error: 'Missing program choices.' }, { status: 400 });
  }

  try {
    const program = buildAiProgramBase(input);
    if (!program.validation.valid) {
      const issue = program.validation.issues.find((entry) => entry.severity === 'error');
      return NextResponse.json({ error: issue?.message ?? 'This configuration does not pass the GRIT rules engine.' }, { status: 400 });
    }
    const output = await requestStructuredProgram({
      provider: 'gemini',
      apiKey: geminiApiKey(),
      model: AI_MODEL,
      prompt: buildAiPrompt(input, program, catalog, history),
      schema: AI_PROGRAM_SCHEMA,
    });
    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Program generation failed.' }, { status: 502 });
  }
}
