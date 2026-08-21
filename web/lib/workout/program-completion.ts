import type { SupabaseClient } from '@supabase/supabase-js';

export async function clearProgramIfComplete(supabase: SupabaseClient, userId: string, programId: string): Promise<boolean> {
  const { data: days, error: daysError } = await supabase.from('program_days').select('id,completed,skipped').eq('program_id', programId);
  if (daysError) throw daysError;
  if (!days?.length || days.some((day) => !day.completed && !day.skipped)) return false;
  const { error: updateError } = await supabase.from('programs').update({ is_current: false }).eq('id', programId).eq('user_id', userId).eq('is_current', true);
  if (updateError) throw updateError;
  return true;
}
