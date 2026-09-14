'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDB } from '@/lib/db';
import { writeWithSync, DATA_CHANGED_EVENT } from '@/lib/sync';
import { SessionType } from '@/types';

export const useSessionTypes = () => {
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const db = await getDB();
    const all = await db.getAll('session_types');
    all.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    setSessionTypes(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(DATA_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, reload);
  }, [reload]);

  const addSessionType = useCallback(
    async (label: string) => {
      const sessionType: SessionType = {
        id: crypto.randomUUID(),
        label,
        created_at: new Date().toISOString(),
      };
      await writeWithSync(
        'session_types',
        'insert',
        sessionType as unknown as Record<string, unknown>
      );
      await reload();
      return sessionType;
    },
    [reload]
  );

  const updateSessionType = useCallback(
    async (id: string, label: string) => {
      const db = await getDB();
      const existing = await db.get('session_types', id);
      if (!existing) return;
      const updated: SessionType = { ...existing, label };
      await writeWithSync(
        'session_types',
        'update',
        updated as unknown as Record<string, unknown>
      );
      await reload();
    },
    [reload]
  );

  const deleteSessionType = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      const db = await getDB();
      const all = await db.getAll('time_entries');
      const inUse = all.some((e) => e.session_type_id === id);
      if (inUse) {
        return {
          success: false,
          error: 'Typ wird verwendet und kann nicht gelöscht werden',
        };
      }
      await writeWithSync('session_types', 'delete', { id });
      await reload();
      return { success: true };
    },
    [reload]
  );

  return { sessionTypes, loading, addSessionType, updateSessionType, deleteSessionType };
};
