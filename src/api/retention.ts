import { supabase } from './supabase';
import { RetentionDashboardRow, RetentionStatus } from '../types/retention';

export async function getMyRetentionStatus(): Promise<RetentionStatus | null> {
  const { data, error } = await supabase
    .from('retention_status')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRetentionDashboard(): Promise<RetentionDashboardRow[]> {
  const { data, error } = await supabase.rpc('get_retention_dashboard');
  if (error) throw error;
  return (data ?? []) as RetentionDashboardRow[];
}

export async function archiveUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('archive_user_data', { target_user_id: userId });
  if (error) throw error;
}

export async function restoreUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('restore_user_data', { target_user_id: userId });
  if (error) throw error;
}

export async function permanentlyDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('permanently_delete_user_data', { target_user_id: userId });
  if (error) throw error;
}

export async function setRetentionExempt(userId: string, exempt: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_retention_exempt', {
    target_user_id: userId,
    exempt,
  });
  if (error) throw error;
}

export async function extendGracePeriod(userId: string, extendDays: number): Promise<void> {
  const { error } = await supabase.rpc('extend_grace_period', {
    target_user_id: userId,
    extend_days: extendDays,
  });
  if (error) throw error;
}

export async function runRetentionJob(): Promise<Array<{ action_taken: string; affected_count: number }>> {
  const { data, error } = await supabase.rpc('run_retention_job');
  if (error) throw error;
  return data ?? [];
}
