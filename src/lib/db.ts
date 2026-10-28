import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Customer,
  SessionType,
  StoredTemplate,
  TimeEntry,
  SyncQueueItem,
  TimerState,
} from '@/types';

interface ZeiterfassungDB extends DBSchema {
  customers: {
    key: string;
    value: Customer;
  };
  session_types: {
    key: string;
    value: SessionType;
  };
  time_entries: {
    key: string;
    value: TimeEntry;
    indexes: { 'by-date': string; 'by-customer': string };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-timestamp': number };
  };
  timer_state: {
    key: string;
    value: TimerState;
  };
  // Local copy of the admin-uploaded Word templates, so exports work offline.
  report_templates: {
    key: string;
    value: StoredTemplate;
  };
}

const BASE_DB_NAME = 'zeiterfassung-db';
const DB_VERSION = 2;

let dbName = BASE_DB_NAME;
let dbPromise: Promise<IDBPDatabase<ZeiterfassungDB>> | null = null;

// Every signed-in user gets a separate local database, so cached data and the
// sync queue of one user are never visible to (or pushed by) another user on
// the same device. Must be called before any hook touches the DB.
export const setDbUser = (userId: string | null): void => {
  const next = userId ? `${BASE_DB_NAME}-${userId}` : BASE_DB_NAME;
  if (next === dbName) return;
  dbName = next;
  const previous = dbPromise;
  dbPromise = null;
  previous?.then((db) => db.close()).catch(() => {});
};

export const getDB = (): Promise<IDBPDatabase<ZeiterfassungDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<ZeiterfassungDB>(dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('session_types')) {
          db.createObjectStore('session_types', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('time_entries')) {
          const store = db.createObjectStore('time_entries', { keyPath: 'id' });
          store.createIndex('by-date', 'entry_date');
          store.createIndex('by-customer', 'customer_id');
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('timer_state')) {
          db.createObjectStore('timer_state', { keyPath: 'key' });
        }
        // Added in version 2; version 1 databases are upgraded in place.
        if (!db.objectStoreNames.contains('report_templates')) {
          db.createObjectStore('report_templates', { keyPath: 'kind' });
        }
      },
    });
  }
  return dbPromise;
};

export type { ZeiterfassungDB };
