'use client';

import { useMemo, useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useToast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AEInput } from '@/components/entry/AEInput';
import { minutesToAE, minutesToHHMM, formatAE } from '@/lib/ae';
import { translateToGerman } from '@/lib/translate';
import { TimeEntry } from '@/types';

const PAGE_SIZE = 50;

const formatDateDDMMYYYY = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

const currentMonthValue = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function SessionsPage() {
  const { customers, activeCustomers } = useCustomers();
  const { sessionTypes } = useSessionTypes();
  const { entries, updateEntry, deleteEntry } = useTimeEntries();
  const { showToast } = useToast();

  const [customerFilter, setCustomerFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonthValue());
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);

  const [editCustomerId, setEditCustomerId] = useState('');
  const [editTypeId, setEditTypeId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMinutes, setEditMinutes] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? '—';
  const sessionTypeLabel = (id: string) => sessionTypes.find((s) => s.id === id)?.label ?? '—';

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (customerFilter && e.customer_id !== customerFilter) return false;
      if (typeFilter && e.session_type_id !== typeFilter) return false;
      if (monthFilter && !e.entry_date.startsWith(monthFilter)) return false;
      return true;
    });
  }, [entries, customerFilter, typeFilter, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalMinutes = filtered.reduce((sum, e) => sum + e.duration_minutes, 0);

  const startEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditCustomerId(entry.customer_id);
    setEditTypeId(entry.session_type_id);
    setEditDate(entry.entry_date);
    setEditMinutes(entry.duration_minutes);
    setEditNotes(entry.notes ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateEntry(editingId, {
      customer_id: editCustomerId,
      session_type_id: editTypeId,
      entry_date: editDate,
      duration_minutes: editMinutes,
      notes: editNotes || null,
    });
    setEditingId(null);
    showToast('Eintrag aktualisiert', 'success');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteEntry(deleteTarget.id);
    setDeleteTarget(null);
    showToast('Eintrag gelöscht', 'success');
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-text">Sessions</h1>

      <div className="sticky top-0 z-10 mb-4 flex flex-wrap gap-3 bg-bg py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <Select
          value={customerFilter}
          onChange={(e) => {
            setCustomerFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Alle Kunden</option>
          {activeCustomers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Alle Typen</option>
          {sessionTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {pageEntries.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Einträge für den gewählten Zeitraum.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Kunde</th>
                <th className="px-3 py-2 font-medium">Typ</th>
                <th className="px-3 py-2 font-medium">Dauer</th>
                <th className="px-3 py-2 font-medium">Notizen</th>
                <th className="px-3 py-2 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) =>
                editingId === entry.id ? (
                  <tr key={entry.id} className="border-b border-border bg-surface-2">
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={editCustomerId} onChange={(e) => setEditCustomerId(e.target.value)}>
                        {activeCustomers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={editTypeId} onChange={(e) => setEditTypeId(e.target.value)}>
                        {sessionTypes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <AEInput minutes={editMinutes} onChange={setEditMinutes} />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        onBlur={async () => {
                          if (!editNotes.trim()) return;
                          const translated = await translateToGerman(editNotes);
                          if (translated) {
                            setEditNotes(translated);
                            showToast('Beschreibung automatisch ins Deutsche übersetzt', 'success');
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          Speichern
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Abbrechen
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id} className="border-b border-border last:border-b-0 hover:bg-surface-2">
                    <td className="whitespace-nowrap px-3 py-2 text-text">
                      {formatDateDDMMYYYY(entry.entry_date)}
                    </td>
                    <td
                      className="max-w-[180px] truncate px-3 py-2 text-text"
                      title={customerName(entry.customer_id)}
                    >
                      {customerName(entry.customer_id)}
                    </td>
                    <td
                      className="max-w-[140px] truncate px-3 py-2 text-text"
                      title={sessionTypeLabel(entry.session_type_id)}
                    >
                      {sessionTypeLabel(entry.session_type_id)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="font-semibold text-text">
                        {minutesToAE(entry.duration_minutes).toFixed(1)} AE
                      </div>
                      <div className="text-xs text-text-muted">
                        {minutesToHHMM(entry.duration_minutes)}
                      </div>
                    </td>
                    <td
                      className={[
                        'max-w-[220px] cursor-pointer px-3 py-2 text-text-muted',
                        expandedNotesId === entry.id ? '' : 'truncate',
                      ].join(' ')}
                      onClick={() =>
                        setExpandedNotesId(expandedNotesId === entry.id ? null : entry.id)
                      }
                    >
                      {entry.notes
                        ? expandedNotesId === entry.id
                          ? entry.notes
                          : entry.notes.length > 60
                          ? entry.notes.slice(0, 60) + '…'
                          : entry.notes
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(entry)}>
                          Bearbeiten
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(entry)}>
                          Löschen
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <div className="flex justify-end bg-surface-2 px-4 py-2 text-sm text-text">
            Gesamt: {filtered.length} Einträge · {formatAE(totalMinutes)} ·{' '}
            {minutesToHHMM(totalMinutes)}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-text">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Zurück
          </Button>
          <span>
            Seite {page} von {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Weiter
          </Button>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eintrag löschen">
        <p className="mb-4 text-sm text-text">Eintrag wirklich löschen?</p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={confirmDelete}>
            Löschen
          </Button>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Abbrechen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
