'use client';

import { useMemo, useState } from 'react';
import { TimerWidget } from '@/components/timer/TimerWidget';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { EntryForm, EntryFormValues } from '@/components/entry/EntryForm';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { formatAE, minutesToHHMM, minutesToAE } from '@/lib/ae';
import { TimeEntry } from '@/types';

export default function DashboardPage() {
  const { customers } = useCustomers();
  const { sessionTypes } = useSessionTypes();
  const { entries, getEntriesToday, updateEntry, deleteEntry } = useTimeEntries();
  const { showToast } = useToast();

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = new Date();
  const dateHeader = today.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const todaysEntries = getEntriesToday();
  const totalTodayMinutes = todaysEntries.reduce((sum, e) => sum + e.duration_minutes, 0);

  const monthEntries = useMemo(() => {
    const now = new Date();
    return entries.filter((e) => {
      const d = new Date(e.entry_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [entries]);

  const monthByCustomer = useMemo(() => {
    const map = new Map<string, { count: number; minutes: number }>();
    for (const e of monthEntries) {
      const existing = map.get(e.customer_id) ?? { count: 0, minutes: 0 };
      existing.count += 1;
      existing.minutes += e.duration_minutes;
      map.set(e.customer_id, existing);
    }
    return map;
  }, [monthEntries]);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? '—';
  const sessionTypeLabel = (id: string) => sessionTypes.find((s) => s.id === id)?.label ?? '—';

  const handleUpdate = async (values: EntryFormValues) => {
    if (!editingEntry) return;
    await updateEntry(editingEntry.id, values);
    setEditingEntry(null);
    showToast('Eintrag aktualisiert', 'success');
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    setConfirmDeleteId(null);
    showToast('Eintrag gelöscht', 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold capitalize text-text">{dateHeader}</h1>

      <TimerWidget />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Heutige Sessions
        </h2>
        {todaysEntries.length === 0 ? (
          <p className="text-sm text-text-muted">Noch keine Einträge heute.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            {todaysEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    {customerName(entry.customer_id)} · {sessionTypeLabel(entry.session_type_id)}
                  </p>
                  {entry.notes && (
                    <p className="truncate text-xs text-text-muted">
                      {entry.notes.slice(0, 60)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text">
                    {minutesToAE(entry.duration_minutes).toFixed(1)} AE
                  </p>
                  <p className="text-xs text-text-muted">
                    {minutesToHHMM(entry.duration_minutes)}
                  </p>
                </div>
                {confirmDeleteId === entry.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Wirklich löschen?</span>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(entry.id)}>
                      Ja
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingEntry(entry)}>
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirmDeleteId(entry.id)}>
                      Löschen
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-end bg-surface-2 px-4 py-2 text-sm text-text">
              Gesamt heute: {formatAE(totalTodayMinutes)} ({minutesToHHMM(totalTodayMinutes)})
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Dieser Monat
        </h2>
        {monthByCustomer.size === 0 ? (
          <p className="text-sm text-text-muted">Noch keine Einträge diesen Monat.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from(monthByCustomer.entries()).map(([customerId, stats]) => (
              <div key={customerId} className="rounded-md border border-border bg-surface p-3">
                <p className="text-sm text-text">{customerName(customerId)}</p>
                <p className="text-xs text-text-muted">{stats.count} Sessionen</p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {minutesToAE(stats.minutes).toFixed(1)} AE
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Eintrag bearbeiten">
        {editingEntry && (
          <EntryForm
            initialValues={{
              customer_id: editingEntry.customer_id,
              session_type_id: editingEntry.session_type_id,
              entry_date: editingEntry.entry_date,
              duration_minutes: editingEntry.duration_minutes,
              notes: editingEntry.notes ?? '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditingEntry(null)}
            submitLabel="Speichern"
          />
        )}
      </Modal>
    </div>
  );
}
