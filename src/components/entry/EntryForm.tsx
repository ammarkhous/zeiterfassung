'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AEInput } from './AEInput';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';

export interface EntryFormValues {
  customer_id: string;
  session_type_id: string;
  entry_date: string;
  duration_minutes: number;
  notes: string;
}

interface EntryFormProps {
  initialValues?: Partial<EntryFormValues>;
  onSubmit: (values: EntryFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const todayDateString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const EntryForm = ({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Eintrag speichern',
}: EntryFormProps) => {
  const { activeCustomers } = useCustomers();
  const { sessionTypes } = useSessionTypes();

  const [customerId, setCustomerId] = useState(initialValues?.customer_id ?? '');
  const [sessionTypeId, setSessionTypeId] = useState(initialValues?.session_type_id ?? '');
  const [entryDate, setEntryDate] = useState(initialValues?.entry_date ?? todayDateString());
  const [durationMinutes, setDurationMinutes] = useState(initialValues?.duration_minutes ?? 0);
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customer_id = 'Kunde ist erforderlich';
    if (!sessionTypeId) newErrors.session_type_id = 'Session-Typ ist erforderlich';
    if (!entryDate) newErrors.entry_date = 'Datum ist erforderlich';
    if (!durationMinutes || durationMinutes <= 0) newErrors.duration = 'Dauer ist erforderlich';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      customer_id: customerId,
      session_type_id: sessionTypeId,
      entry_date: entryDate,
      duration_minutes: durationMinutes,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select
        label="Kunde *"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        error={errors.customer_id}
        fullWidth
      >
        <option value="">Kunde wählen...</option>
        {activeCustomers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        label="Session-Typ *"
        value={sessionTypeId}
        onChange={(e) => setSessionTypeId(e.target.value)}
        error={errors.session_type_id}
        fullWidth
      >
        <option value="">Typ wählen...</option>
        {sessionTypes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </Select>

      <Input
        label="Datum *"
        type="date"
        value={entryDate}
        onChange={(e) => setEntryDate(e.target.value)}
        error={errors.entry_date}
        fullWidth
      />

      <AEInput minutes={durationMinutes} onChange={setDurationMinutes} />
      {errors.duration && <p className="-mt-3 text-xs text-danger">{errors.duration}</p>}

      <div>
        <label className="mb-1 block text-sm text-text-muted">Notizen</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" fullWidth={!onCancel}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  );
};
