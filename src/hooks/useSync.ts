'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drainSyncQueue, pullFromSupabase } from '@/lib/sync';
import { getDB } from '@/lib/db';
import { SyncStatus } from '@/types';
import { useOnlineStatus } from './useOnlineStatus';

export const useSync = () => {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const didInitialSync = useRef(false);

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

    setSyncStatus('syncing');
    try {
      await pullFromSupabase();
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
    if (!isOnline) {
      setSyncStatus('offline');
    }
  }, [isOnline]);

  return { syncStatus, lastSynced, triggerSync };
};
