export interface Customer {
  id: string;
  name: string;
  ae_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionType {
  id: string;
  label: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  customer_id: string;
  session_type_id: string;
  duration_minutes: number;
  notes: string | null;
  entry_date: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  /** Owner of the entry; filled in by the server (default auth.uid()). */
  user_id?: string;
  /** Optional finger signatures as PNG data URLs, captured right after a timer session. */
  technician_signature?: string | null;
  customer_signature?: string | null;
  signed_at?: string | null;
}

export interface SyncQueueItem {
  id: string;
  table: 'customers' | 'session_types' | 'time_entries';
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface TimerState {
  /** One uuid per timer; the legacy single timer used the fixed key 'active'. */
  key: string;
  customer_id: string;
  session_type_id: string;
  /** Start of the current running stretch (reset on resume). */
  started_at: string;
  /** Set once when the timer is created; used for stable ordering. */
  created_at?: string;
  status: 'running' | 'paused' | 'stopped';
  accumulated_seconds: number;
  /** Rounded minutes frozen by "Stoppen", waiting to be saved or discarded. */
  frozen_minutes?: number;
}

export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  username: string | null;
  role: UserRole;
  disabled: boolean;
}

export interface AdminUser {
  id: string;
  email: string | null;
  username: string | null;
  role: UserRole | null;
  disabled: boolean;
  has_profile: boolean;
  providers: string[];
  created_at: string;
  last_sign_in_at: string | null;
  entry_count: number;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface MonthlyReportRow {
  customer: Customer;
  entries: TimeEntry[];
  total_minutes: number;
  total_ae: number;
  total_value: number;
}
