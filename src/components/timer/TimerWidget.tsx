'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useTimer } from '@/hooks/useTimer';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';

const formatHHMMSS = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

export const TimerWidget = () => {
  const { activeCustomers } = useCustomers();
  const { sessionTypes } = useSessionTypes();
  const {
    timerState,
    isRunning,
    isStopped,
    elapsedSeconds,
    frozenMinutes,
    startTimer,
    stopTimer,
    saveSession,
    discardSession,
  } = useTimer();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const customer = activeCustomers.find((c) => c.id === timerState?.customer_id);
  const sessionType = sessionTypes.find((s) => s.id === timerState?.session_type_id);

  const handleStart = async () => {
    if (!customerId || !sessionTypeId) return;
    await startTimer(customerId, sessionTypeId);
  };

  const handleSave = async () => {
    if (frozenMinutes === null) return;
    setSaving(true);
    await saveSession(frozenMinutes, notes);
    setSaving(false);
    setNotes('');
    setCustomerId('');
    setSessionTypeId('');
    showToast('Session gespeichert', 'success');
  };

  const handleDiscard = async () => {
    await discardSession();
    setNotes('');
    showToast('Session verworfen');
  };

  if (isStopped && frozenMinutes !== null) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text">
          Dauer: <span className="font-semibold">{minutesToHHMM(frozenMinutes)}</span> ={' '}
          <span className="font-semibold">{minutesToAE(frozenMinutes).toFixed(1)} AE</span>
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notizen (optional)..."
          rows={3}
          className="mb-3 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            Speichern
          </Button>
          <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
            Verwerfen
          </Button>
        </div>
      </div>
    );
  }

  if (isRunning && timerState) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-text">
          <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span>
            {customer?.name ?? '...'} · {sessionType?.label ?? '...'}
          </span>
        </div>
        <div className="mb-4 font-mono text-4xl font-semibold text-text">
          {formatHHMMSS(elapsedSeconds)}
        </div>
        <Button variant="danger" onClick={() => stopTimer()}>
          Stoppen
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
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
          value={sessionTypeId}
          onChange={(e) => setSessionTypeId(e.target.value)}
          fullWidth
        >
          <option value="">Typ wählen...</option>
          {sessionTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <Button onClick={handleStart} disabled={!customerId || !sessionTypeId}>
        Starten
      </Button>
      <div className="mt-3">
        <Link href="/new-entry" className="text-sm text-accent hover:underline">
          Manuell erfassen →
        </Link>
      </div>
    </div>
  );
};
