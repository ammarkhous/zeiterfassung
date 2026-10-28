'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { TimerView } from '@/hooks/useTimers';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';
import { translateToGerman } from '@/lib/translate';

const formatHHMMSS = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

interface TimerCardProps {
  timer: TimerView;
  customerName: string;
  sessionTypeLabel: string;
  onPause: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
  onStop: () => void | Promise<unknown>;
  onSave: (minutes: number, notes: string) => Promise<void>;
  onDiscard: () => Promise<void>;
}

export const TimerCard = ({
  timer,
  customerName,
  sessionTypeLabel,
  onPause,
  onResume,
  onStop,
  onSave,
  onDiscard,
}: TimerCardProps) => {
  const { showToast } = useToast();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  const isRunning = timer.status === 'running';
  const isPaused = timer.status === 'paused';
  const isStopped = timer.status === 'stopped';
  const elapsedSeconds = timer.elapsedSeconds;

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
    setSaving(true);
    const finalNotes = await translateNotesIfNeeded(notes);
    await onSave(timer.frozen_minutes ?? 1, finalNotes);
    setSaving(false);
    showToast('Session gespeichert', 'success');
  };

  const handleDiscard = async () => {
    await onDiscard();
    showToast('Session verworfen');
  };

  const handleNotesBlur = () => {
    translateNotesIfNeeded(notes);
  };

  if (isStopped) {
    const frozenMinutes = timer.frozen_minutes ?? 1;
    return (
      <div className="rounded-3xl border border-border bg-surface p-6">
        <p
          className="mb-1 truncate text-xs font-semibold uppercase tracking-wide text-text-muted"
          title={`${customerName} · ${sessionTypeLabel}`}
        >
          {customerName} · {sessionTypeLabel}
        </p>
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

  const secondsInMinute = elapsedSeconds % 60;
  const ringProgress = secondsInMinute / 60;
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);
  const ringJustWrapped = secondsInMinute === 0;
  const cometAngle = ringProgress * 2 * Math.PI;
  const cometX = 50 + ringRadius * Math.cos(cometAngle);
  const cometY = 50 + ringRadius * Math.sin(cometAngle);

  return (
    <div className="timer-pop-in relative overflow-hidden rounded-3xl bg-accent p-6 text-white">
      {isRunning && (
        <>
          <div className="liquid-blob liquid-blob-lime -left-16 -top-16 h-72 w-72" />
          <div className="liquid-blob liquid-blob-cyan -bottom-20 -right-12 h-80 w-80" />
          <div className="liquid-blob liquid-blob-magenta left-1/3 top-1/2 h-56 w-56" />
        </>
      )}
      <div className="relative z-10">
        <div className="mb-6 flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
          <span className="relative inline-flex h-2 w-2 shrink-0">
            {isRunning && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-lime opacity-75" />
            )}
            <span
              className={[
                'relative inline-block h-2 w-2 rounded-full',
                isRunning ? 'bg-accent-lime' : 'pulse-dot bg-warning',
              ].join(' ')}
            />
          </span>
          <span className="truncate" title={`${customerName} · ${sessionTypeLabel}`}>
            {isPaused ? 'Pausiert' : 'Läuft'} · {customerName} · {sessionTypeLabel}
          </span>
          {isRunning && (
            <span className="ml-1 flex h-3 shrink-0 items-end gap-[2px]" aria-hidden>
              <span className="eq-bar h-full w-[2px] rounded-full bg-accent-lime" style={{ animationDelay: '0s' }} />
              <span className="eq-bar h-full w-[2px] rounded-full bg-[#38d9e8]" style={{ animationDelay: '0.15s' }} />
              <span className="eq-bar h-full w-[2px] rounded-full bg-accent-lime" style={{ animationDelay: '0.3s' }} />
              <span className="eq-bar h-full w-[2px] rounded-full bg-[#38d9e8]" style={{ animationDelay: '0.45s' }} />
            </span>
          )}
        </div>
        <div className="timer-digit-in relative mx-auto mb-6 flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72">
          {isRunning && <span key={`shock-${elapsedSeconds}`} className="shockwave-ring" aria-hidden />}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle
              cx="50"
              cy="50"
              r={ringRadius}
              fill="none"
              stroke="var(--accent-lime)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              style={{
                transition: ringJustWrapped ? 'none' : 'stroke-dashoffset 1s linear',
                filter: isRunning ? 'drop-shadow(0 0 6px var(--accent-lime))' : 'none',
              }}
            />
            {isRunning && (
              <circle
                cx={cometX}
                cy={cometY}
                r="3.2"
                fill="var(--accent-lime)"
                style={{ filter: 'drop-shadow(0 0 6px var(--accent-lime))' }}
              />
            )}
          </svg>
          <div
            key={isRunning ? `digits-${elapsedSeconds}` : 'digits-static'}
            className={[
              'relative z-10 text-center font-mono text-4xl font-bold tabular-nums sm:text-5xl',
              isRunning ? 'neon-digits glitch-jolt text-white' : 'text-white/70',
            ].join(' ')}
          >
            {formatHHMMSS(elapsedSeconds)}
          </div>
        </div>
        <p className="mb-6 text-center text-sm text-white/60">Jede Minute zählt.</p>
        <div className="flex gap-2">
          {isRunning ? (
            <Button
              variant="secondary"
              fullWidth
              className="border-white/15 bg-white/10 text-white hover:bg-white/20"
              onClick={() => onPause()}
            >
              Pausieren
            </Button>
          ) : (
            <Button variant="lime" fullWidth onClick={() => onResume()}>
              Fortsetzen
            </Button>
          )}
          <Button variant="danger" fullWidth onClick={() => onStop()}>
            Stoppen
          </Button>
        </div>
      </div>
    </div>
  );
};
