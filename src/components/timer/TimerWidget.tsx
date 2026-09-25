'use client';

import { useState } from 'react';
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

const darkFieldClass =
  'border-white/15 bg-white/10 text-white placeholder:text-white/50 focus:border-accent-lime focus:ring-accent-lime';

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
      <div className="rounded-3xl border border-border bg-surface p-6">
        <p className="mb-3 text-sm text-text">
          Dauer: <span className="font-bold">{minutesToHHMM(frozenMinutes)}</span> ={' '}
          <span className="font-bold">{minutesToAE(frozenMinutes).toFixed(1)} AE</span>
        </p>
        <div className="mb-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Notizen / Beschreibung (optional, erscheint auf der Abrechnung)..."
            rows={3}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
      <div className="rounded-3xl bg-accent p-6 text-white">
        <div className="mb-6 flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
          <span
            className={[
              'inline-block h-2 w-2 shrink-0 rounded-full',
              isRunning ? 'pulse-dot bg-accent-lime' : 'bg-warning',
            ].join(' ')}
          />
          <span className="truncate" title={`${customer?.name ?? '...'} · ${sessionType?.label ?? '...'}`}>
            {isPaused ? 'Pausiert' : 'Läuft'} · {customer?.name ?? '...'} · {sessionType?.label ?? '...'}
          </span>
        </div>
        <div className="mb-2 text-center font-mono text-5xl font-bold tabular-nums sm:text-6xl">
          {formatHHMMSS(elapsedSeconds)}
        </div>
        <p className="mb-6 text-center text-sm text-white/60">Jede Minute zählt.</p>
        <div className="flex gap-2">
          {isRunning ? (
            <Button
              variant="secondary"
              fullWidth
              className="border-white/15 bg-white/10 text-white hover:bg-white/20"
              onClick={() => pauseTimer()}
            >
              Pausieren
            </Button>
          ) : (
            <Button variant="lime" fullWidth onClick={() => resumeTimer()}>
              Fortsetzen
            </Button>
          )}
          <Button variant="danger" fullWidth onClick={() => stopTimer()}>
            Stoppen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-accent p-6 text-white">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent-lime" />
          Bereit, wenn Sie es sind
        </span>
      </div>
      <div className="mb-6 text-center font-mono text-5xl font-bold tabular-nums text-white/30 sm:text-6xl">
        00:00:00
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={darkFieldClass}
          chevronClassName="text-white/60"
          fullWidth
        >
          <option value="" className="text-text">Kunde wählen...</option>
          {activeCustomers.map((c) => (
            <option key={c.id} value={c.id} className="text-text">
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={sessionTypeId}
          onChange={(e) => setSessionTypeId(e.target.value)}
          className={darkFieldClass}
          chevronClassName="text-white/60"
          fullWidth
        >
          <option value="" className="text-text">Typ wählen...</option>
          {sessionTypes.map((s) => (
            <option key={s.id} value={s.id} className="text-text">
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <Button
        variant="lime"
        fullWidth
        onClick={handleStart}
        disabled={!customerId || !sessionTypeId}
      >
        ▶ Timer starten
      </Button>
    </div>
  );
};
