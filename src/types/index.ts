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
}

export interface SyncQueueItem {
  id: string;
  table: 'customers' | 'session_types' | 'time_entries';
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface TimerState {
  key: 'active';
  customer_id: string;
  session_type_id: string;
  started_at: string;
  status: 'running' | 'paused';
  accumulated_seconds: number;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface MonthlyReportRow {
  customer: Customer;
  entries: TimeEntry[];
  total_minutes: number;
  total_ae: number;
  total_value: number;
}
