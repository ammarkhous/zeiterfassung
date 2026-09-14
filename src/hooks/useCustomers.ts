'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDB } from '@/lib/db';
import { writeWithSync, DATA_CHANGED_EVENT } from '@/lib/sync';
import { Customer } from '@/types';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const db = await getDB();
    const all = await db.getAll('customers');
    all.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    setCustomers(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(DATA_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, reload);
  }, [reload]);

  const addCustomer = useCallback(
    async (name: string, ae_rate: number) => {
      const now = new Date().toISOString();
      const customer: Customer = {
        id: crypto.randomUUID(),
        name,
        ae_rate,
        active: true,
        created_at: now,
        updated_at: now,
      };
      await writeWithSync('customers', 'insert', customer as unknown as Record<string, unknown>);
      await reload();
      return customer;
    },
    [reload]
  );

  const updateCustomer = useCallback(
    async (id: string, changes: Partial<Pick<Customer, 'name' | 'ae_rate' | 'active'>>) => {
      const db = await getDB();
      const existing = await db.get('customers', id);
      if (!existing) return;
      const updated: Customer = {
        ...existing,
        ...changes,
        updated_at: new Date().toISOString(),
      };
      await writeWithSync('customers', 'update', updated as unknown as Record<string, unknown>);
      await reload();
    },
    [reload]
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const db = await getDB();
      const existing = await db.get('customers', id);
      if (!existing) return;
      await updateCustomer(id, { active: !existing.active });
    },
    [updateCustomer]
  );

  const deleteCustomer = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      const db = await getDB();
      const entries = await db.getAllFromIndex('time_entries', 'by-customer', id);
      if (entries.length > 0) {
        return {
          success: false,
          error: 'Kunde hat Einträge und kann nicht gelöscht werden',
        };
      }
      await writeWithSync('customers', 'delete', { id });
      await reload();
      return { success: true };
    },
    [reload]
  );

  const activeCustomers = customers.filter((c) => c.active);

  return {
    customers,
    activeCustomers,
    loading,
    addCustomer,
    updateCustomer,
    toggleActive,
    deleteCustomer,
  };
};
