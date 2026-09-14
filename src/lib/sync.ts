import { getDB } from './db';
import { supabase } from './supabase';
import { Customer, SessionType, TimeEntry, SyncQueueItem } from '@/types';

type TableName = 'customers' | 'session_types' | 'time_entries';
type Operation = 'insert' | 'update' | 'delete';

const isOnline = (): boolean =>
  typeof navigator !== 'undefined' ? navigator.onLine : true;

export const DATA_CHANGED_EVENT = 'zeiterfassung:data-changed';

const notifyDataChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
};

export const pullFromSupabase = async (): Promise<void> => {
  const db = await getDB();

  const [{ data: customers }, { data: sessionTypes }, { data: timeEntries }] =
    await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('session_types').select('*'),
      supabase.from('time_entries').select('*'),
    ]);

  if (customers) {
    const tx = db.transaction('customers', 'readwrite');
    for (const c of customers as Customer[]) {
      await tx.store.put(c);
    }
    await tx.done;
  }

  if (sessionTypes) {
    const tx = db.transaction('session_types', 'readwrite');
    for (const s of sessionTypes as SessionType[]) {
      await tx.store.put(s);
    }
    await tx.done;
  }

  if (timeEntries) {
    const tx = db.transaction('time_entries', 'readwrite');
    for (const e of timeEntries as TimeEntry[]) {
      await tx.store.put(e);
    }
    await tx.done;
  }

  notifyDataChanged();
};

export const pushToSupabase = async (item: SyncQueueItem): Promise<boolean> => {
  try {
    const { table, operation, payload } = item;

    if (operation === 'insert') {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    } else if (operation === 'update') {
      const { id, ...rest } = payload as { id: string; [k: string]: unknown };
      const { error } = await supabase.from(table).update(rest).eq('id', id);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { id } = payload as { id: string };
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error('Sync-Fehler beim Push zu Supabase:', err);
    return false;
  }
};

export const queueOperation = async (
  table: TableName,
  operation: Operation,
  payload: Record<string, unknown>
): Promise<void> => {
  const db = await getDB();
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    table,
    operation,
    payload,
    timestamp: Date.now(),
  };
  await db.put('sync_queue', item);
};

export const drainSyncQueue = async (): Promise<boolean> => {
  if (!isOnline()) return false;

  const db = await getDB();
  const items = await db.getAllFromIndex('sync_queue', 'by-timestamp');

  let allSucceeded = true;

  for (const item of items) {
    const success = await pushToSupabase(item);
    if (success) {
      await db.delete('sync_queue', item.id);
    } else {
      allSucceeded = false;
      break;
    }
  }

  return allSucceeded;
};

export const writeWithSync = async (
  table: TableName,
  operation: Operation,
  payload: Record<string, unknown>
): Promise<void> => {
  const db = await getDB();

  if (operation === 'delete') {
    await db.delete(table, payload.id as string);
  } else {
    await db.put(table, payload as unknown as Customer & SessionType & TimeEntry);
  }

  await queueOperation(table, operation, payload);
  notifyDataChanged();

  if (isOnline()) {
    await drainSyncQueue();
  }
};
