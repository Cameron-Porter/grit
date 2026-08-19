type ProgramSaveDb = {
  rpc: (name: string, args: {
    p_program: unknown;
    p_days: unknown[];
    p_template_exercises: unknown[];
    p_targets: unknown[];
  }) => PromiseLike<{ data: string | null; error: { message?: string } | null }>;
};

export type AiProgramSaveRequest = {
  programId: string;
  program: Record<string, unknown>;
  days: Record<string, unknown>[];
  templateExercises: Record<string, unknown>[];
  targets: Record<string, unknown>[];
};

export async function saveAiProgramTransaction(db: ProgramSaveDb, request: AiProgramSaveRequest) {
  const { data, error } = await db.rpc('save_ai_program', {
    p_program: request.program,
    p_days: request.days,
    p_template_exercises: request.templateExercises,
    p_targets: request.targets,
  });
  if (error || data !== request.programId) throw new Error('The program could not be saved atomically.');
  return data;
}
