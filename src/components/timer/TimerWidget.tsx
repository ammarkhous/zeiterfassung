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
import { translateToGerman } from '@/lib/translate';

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
    isPaused,
    isStopped,
    elapsedSeconds,
    frozenMinutes,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    saveSession,
    discardSession,
  } = useTimer();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  const customer = activeCustomers.find((c) => c.id === timerState?.customer_id);
  const sessionType = sessionTypes.find((s) => s.id === timerState?.session_type_id);

  const handleStart = async () => {
    if (!customerId || !sessionTypeId) return;
    await startTimer(customerId, sessionTypeId);
  };

  // Returns the final (possibly translated) notes text. Always awaited before a
  // save actually happens (see handleSave) so a save can never race ahead of the
  // async translation and persist the untranslated original - onBlur alone isn't
  // reliable, since a Save click right after editing notes can fire before the
  // blur-triggered translation resolves.
  const translateNotesIfNeeded = async (currentNotes: string): Promise<string> => {
    if (!currentNotes.trim()) return currentNotes;
    setTranslating(true);
    const translated = await translateToGerman(currentNotes);
    setTranslating(false);
    if (translated) {
      setNotes(translated);
      showToast('Beschreibung automatisch ins Deutsche übersetzt', 'success');
      return translated;
    }
    return currentNotes;
  };

  const handleSave = async () => {
    if (frozenMinutes === null) return;
    setSaving(true);
    const finalNotes = await translateNotesIfNeeded(notes);
    await saveSession(frozenMinutes, finalNotes);
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

  const handleNotesBlur = () => {
    translateNotesIfNeeded(notes);
  };

  if (isStopped && frozenMinutes !== null) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text">
          Dauer: <span className="font-semibold">{minutesToHHMM(frozenMinutes)}</span> ={' '}
          <span className="font-semibold">{minutesToAE(frozenMinutes).toFixed(1)} AE</span>
        </p>
        <div className="mb-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Notizen / Beschreibung (optional, erscheint auf der Abrechnung)..."
            rows={3}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {translating && (
            <p className="mt-1 text-xs text-text-muted">Übersetzung wird geprüft...</p>
          )}
        </div>
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

  if ((isRunning || isPaused) && timerState) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex min-w-0 items-center gap-2 text-sm text-text">
          <span
            className={[
              'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
              isRunning ? 'pulse-dot bg-accent' : 'bg-warning',
            ].join(' ')}
          />
          <span className="truncate" title={`${customer?.name ?? '...'} · ${sessionType?.label ?? '...'}`}>
            {customer?.name ?? '...'} · {sessionType?.label ?? '...'}
          </span>
          {isPaused && (
            <span className="shrink-0 text-xs font-medium text-warning">Pausiert</span>
          )}
        </div>
        <div className="mb-4 font-mono text-4xl font-semibold text-text">
          {formatHHMMSS(elapsedSeconds)}
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="secondary" onClick={() => pauseTimer()}>
              Pausieren
            </Button>
          ) : (
            <Button variant="primary" onClick={() => resumeTimer()}>
              Fortsetzen
            </Button>
          )}
          <Button variant="danger" onClick={() => stopTimer()}>
            Stoppen
          </Button>
        </div>
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
