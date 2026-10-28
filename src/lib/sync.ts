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

const reconcileTable = async <T extends { id: string }>(
  table: TableName,
  remoteRows: T[],
  pendingIds: Set<string>
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(table, 'readwrite');
  const remoteIds = new Set(remoteRows.map((r) => r.id));

  for (const row of remoteRows) {
    await tx.store.put(row as unknown as Customer & SessionType & TimeEntry);
  }

  const localRows = await tx.store.getAll();
  for (const local of localRows as { id: string }[]) {
    if (!remoteIds.has(local.id) && !pendingIds.has(local.id)) {
      await tx.store.delete(local.id);
    }
  }

  await tx.done;
};

export const pullFromSupabase = async (): Promise<void> => {
  const db = await getDB();

  const [{ data: customers }, { data: sessionTypes }, { data: timeEntries }, queueItems] =
    await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('session_types').select('*'),
      supabase.from('time_entries').select('*'),
      db.getAll('sync_queue'),
    ]);

  const pendingIds = new Set(
    queueItems.map((item) => (item.payload as { id?: string }).id).filter(Boolean) as string[]
  );

  if (customers) {
    await reconcileTable('customers', customers as Customer[], pendingIds);
  }

  if (sessionTypes) {
    await reconcileTable('session_types', sessionTypes as SessionType[], pendingIds);
  }

  if (timeEntries) {
    await reconcileTable('time_entries', timeEntries as TimeEntry[], pendingIds);
  }

  notifyDataChanged();
};

export const SYNC_REJECTED_EVENT = 'zeiterfassung:sync-rejected';

// ok       - pushed, remove from queue
// retry    - network / auth / server trouble, keep in queue and try again later
// rejected - the server will never accept this change (constraint or RLS
//            violation); keeping it would block every later queue item
type PushResult = 'ok' | 'retry' | 'rejected';

// Postgres error classes that retrying can never fix: 22 data exception,
// 23 integrity constraint violation, 42 syntax / insufficient privilege.
const PERMANENT_ERROR_CODE = /^(22|23|42)/;

export const pushToSupabase = async (item: SyncQueueItem): Promise<PushResult> => {
  try {
    const { table, operation, payload } = item;
    let error: { code?: string; message?: string } | null = null;

    if (operation === 'insert') {
      ({ error } = await supabase.from(table).insert(payload));
    } else if (operation === 'update') {
      const { id, ...rest } = payload as { id: string; [k: string]: unknown };
      ({ error } = await supabase.from(table).update(rest).eq('id', id));
    } else if (operation === 'delete') {
      const { id } = payload as { id: string };
      ({ error } = await supabase.from(table).delete().eq('id', id));
    }

    if (!error) return 'ok';

    console.error('Sync-Fehler beim Push zu Supabase:', error);
    return error.code && PERMANENT_ERROR_CODE.test(error.code) ? 'rejected' : 'retry';
  } catch (err) {
    console.error('Sync-Fehler beim Push zu Supabase:', err);
    return 'retry';
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

// One pass over the queue, oldest first. Returns false when a retryable failure
// stopped the pass (rejected items are dropped and do not count as failure).
const drainOnce = async (): Promise<boolean> => {
  const db = await getDB();
  const items = await db.getAllFromIndex('sync_queue', 'by-timestamp');

  let rejected = 0;
  let allSucceeded = true;

  for (const item of items) {
    const result = await pushToSupabase(item);
    if (result === 'retry') {
      allSucceeded = false;
      break;
    }
    await db.delete('sync_queue', item.id);
    if (result === 'rejected') rejected += 1;
  }

  if (rejected > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_REJECTED_EVENT, { detail: { count: rejected } }));
    // Bring the local copy back in line with what the server really holds.
    pullFromSupabase().catch((err) => console.error('Pull nach abgelehnter Änderung fehlgeschlagen:', err));
  }

  return allSucceeded;
};

// Only one drain may run at a time; two concurrent passes would push the same
// queue item twice (and the second insert would then look like a rejection).
// A drain requested mid-run makes the running one do another pass, so writes
// queued while it was working are not left behind.
let draining: Promise<boolean> | null = null;
let drainAgain = false;

export const drainSyncQueue = (): Promise<boolean> => {
  if (!isOnline()) return Promise.resolve(false);
  if (draining) {
    drainAgain = true;
    return draining;
  }

  draining = (async () => {
    try {
      let allSucceeded = true;
      for (;;) {
        drainAgain = false;
        if (!(await drainOnce())) {
          allSucceeded = false;
          break;
        }
        if (!drainAgain) break;
      }
      return allSucceeded;
    } finally {
      draining = null;
    }
  })();

  return draining;
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
