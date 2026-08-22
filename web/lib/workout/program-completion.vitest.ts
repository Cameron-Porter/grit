import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { clearProgramIfComplete } from './program-completion';

function queryResult(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update']) chain[method] = vi.fn(() => chain);
  Object.defineProperty(chain, 'then', {
    get: () => (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  });
  return chain;
}

function supabaseWith(days: Array<{ id: string; completed: boolean; skipped: boolean }>, updateError: unknown = null) {
  const from = vi.fn((table: string) => (table === 'program_days' ? queryResult(days) : queryResult(null, updateError)));
  return { from } as unknown as SupabaseClient;
}

describe('clearProgramIfComplete', () => {
  it('clears is_current when every day is completed or skipped', async () => {
    const supabase = supabaseWith([{ id: 'd1', completed: true, skipped: false }, { id: 'd2', completed: false, skipped: true }]);
    await expect(clearProgramIfComplete(supabase, 'user-1', 'program-1')).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('programs');
  });

  it('does not clear when an open day remains', async () => {
    const supabase = supabaseWith([{ id: 'd1', completed: true, skipped: false }, { id: 'd2', completed: false, skipped: false }]);
    await expect(clearProgramIfComplete(supabase, 'user-1', 'program-1')).resolves.toBe(false);
    expect(supabase.from).not.toHaveBeenCalledWith('programs');
  });

  it('treats a skipped last day the same as a completed one', async () => {
    const supabase = supabaseWith([{ id: 'd1', completed: true, skipped: false }, { id: 'd2', completed: false, skipped: true }, { id: 'd3', completed: true, skipped: false }]);
    await expect(clearProgramIfComplete(supabase, 'user-1', 'program-1')).resolves.toBe(true);
  });

  it('treats an empty program as incomplete', async () => {
    const supabase = supabaseWith([]);
    await expect(clearProgramIfComplete(supabase, 'user-1', 'program-1')).resolves.toBe(false);
  });

  it('throws when the day lookup fails', async () => {
    const supabase = { from: vi.fn(() => queryResult(null, new Error('boom'))) } as unknown as SupabaseClient;
    await expect(clearProgramIfComplete(supabase, 'user-1', 'program-1')).rejects.toThrow('boom');
  });

  it('throws when clearing is_current fails', async () => {
    const supabase = supabaseWith([{ id: 'd1', completed: true, skipped: false }], new Error('update failed'));
    await expect(clearProgramIfComplete(supabase, 'user-1', 'program-1')).rejects.toThrow('update failed');
  });
});
