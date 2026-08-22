import { describe, expect, it, vi } from 'vitest';
import { saveAiProgramTransaction } from './program-save';

const request = {
  programId: '00000000-0000-4000-8000-000000000001',
  program: { id: '00000000-0000-4000-8000-000000000001', user_id: 'user-1', name: 'AI Program' },
  days: [{ id: '00000000-0000-4000-8000-000000000002', program_id: '00000000-0000-4000-8000-000000000001', week_number: 1, day_number: 1, label: 'Pull' }],
  templateExercises: [{ program_day_id: '00000000-0000-4000-8000-000000000002', exercise_name: 'Row', sort_order: 0 }],
  targets: [{ program_day_id: '00000000-0000-4000-8000-000000000002', exercise_name: 'Row', target_sets: 3 }],
};

describe('saveAiProgramTransaction', () => {
  it('saves all program rows through one RPC transaction', async () => {
    const rpc = vi.fn(async () => ({ data: request.programId, error: null }));

    await expect(saveAiProgramTransaction({ rpc }, request)).resolves.toBe(request.programId);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('save_ai_program', {
      p_program: request.program,
      p_days: request.days,
      p_template_exercises: request.templateExercises,
      p_targets: request.targets,
    });
  });

  it('fails visibly instead of leaving cleanup to best-effort deletes', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'target insert failed' } }));

    await expect(saveAiProgramTransaction({ rpc }, request)).rejects.toThrow('The program could not be saved atomically.');
  });
});
