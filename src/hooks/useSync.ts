'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drainSyncQueue, pullFromSupabase } from '@/lib/sync';
import { pullTemplates } from '@/lib/templates';
import { getDB } from '@/lib/db';
import { SyncStatus } from '@/types';
import { useOnlineStatus } from './useOnlineStatus';

// Customers and session types are shared between users, so changes made by
// someone else must arrive without restarting the app. Coming back to the
// window re-syncs, but at most this often.
const FOCUS_SYNC_MIN_INTERVAL_MS = 60_000;

export const useSync = () => {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const didInitialSync = useRef(false);
  const lastSyncStartedAt = useRef(0);

  const checkQueueEmpty = useCallback(async () => {
    const db = await getDB();
    const count = await db.count('sync_queue');
    return count === 0;
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    lastSyncStartedAt.current = Date.now();
    setSyncStatus('syncing');
    try {
      await pullFromSupabase();
      // The shared Word templates are small metadata checks; a failure here must
      // never turn the sync status red.
      await pullTemplates().catch((err) => console.error('Vorlagen-Sync fehlgeschlagen:', err));
      const success = await drainSyncQueue();
      const queueEmpty = await checkQueueEmpty();
      if (success && queueEmpty) {
        setSyncStatus('synced');
        setLastSynced(new Date());
      } else if (!queueEmpty) {
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSynced(new Date());
      }
    } catch (err) {
      console.error('Sync fehlgeschlagen:', err);
      setSyncStatus('error');
    }
  }, [checkQueueEmpty]);

  useEffect(() => {
    if (didInitialSync.current) return;
    didInitialSync.current = true;
    if (navigator.onLine) {
      triggerSync();
    } else {
      setSyncStatus('offline');
    }
  }, [triggerSync]);

  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('syncing');
      try {
        const success = await drainSyncQueue();
        const queueEmpty = await checkQueueEmpty();
        if (success && queueEmpty) {
          setSyncStatus('synced');
          setLastSynced(new Date());
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        console.error('Sync fehlgeschlagen:', err);
        setSyncStatus('error');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [checkQueueEmpty]);

  useEffect(() => {
    const syncOnReturn = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (Date.now() - lastSyncStartedAt.current < FOCUS_SYNC_MIN_INTERVAL_MS) return;
      triggerSync();
    };

    document.addEventListener('visibilitychange', syncOnReturn);
    window.addEventListener('focus', syncOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', syncOnReturn);
      window.removeEventListener('focus', syncOnReturn);
    };
  }, [triggerSync]);

  useEffect(() => {
    if (!isOnline) {
      setSyncStatus('offline');
    }
  }, [isOnline]);

  return { syncStatus, lastSynced, triggerSync };
};
