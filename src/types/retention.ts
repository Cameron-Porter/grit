export type RetentionStatusValue = 'grace_period' | 'archived' | 'permanently_deleted';

export interface RetentionStatus {
  user_id: string;
  status: RetentionStatusValue;
  entered_retention_at: string;
  archive_eligible_at: string;
  delete_eligible_at: string;
  archived_at: string | null;
  permanently_deleted_at: string | null;
  last_evaluated_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetentionAuditLog {
  id: string;
  user_id: string;
  action: string;
  performed_by: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RetentionDashboardRow {
  user_id: string;
  email: string;
  role: string;
  retention_exempt: boolean;
  subscription_status: string;
  retention_status: RetentionStatusValue;
  entered_retention_at: string;
  archive_eligible_at: string;
  delete_eligible_at: string;
  archived_at: string | null;
  permanently_deleted_at: string | null;
  days_in_retention: number;
  days_until_archive: number;
  days_until_deletion: number;
}
