import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, SessionType, TimeEntry, SyncQueueItem, TimerState } from '@/types';

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
}

const DB_NAME = 'zeiterfassung-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ZeiterfassungDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<ZeiterfassungDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<ZeiterfassungDB>(DB_NAME, DB_VERSION, {
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
      },
    });
  }
  return dbPromise;
};

export type { ZeiterfassungDB };
