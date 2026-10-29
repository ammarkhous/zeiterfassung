'use client';

import { Button } from '@/components/ui/Button';
import { TimerView } from '@/hooks/useTimers';

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
  /** Slim row instead of the big ring: used as soon as more than one timer is open. */
  compact?: boolean;
  onPause: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
  onStop: () => void | Promise<unknown>;
}

// A running or paused timer. Stopped timers are finished in FinishSessionModal.
export const TimerCard = ({
  timer,
  customerName,
  sessionTypeLabel,
  compact = false,
  onPause,
  onResume,
  onStop,
}: TimerCardProps) => {
  const isRunning = timer.status === 'running';
  const isPaused = timer.status === 'paused';
  const elapsedSeconds = timer.elapsedSeconds;

  const secondsInMinute = elapsedSeconds % 60;
  const ringProgress = secondsInMinute / 60;
  const ringJustWrapped = secondsInMinute === 0;

  if (compact) {
    return (
      <div className="timer-pop-in relative overflow-hidden rounded-2xl bg-accent px-4 pb-4 pt-3 text-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-44">
            <p className="mb-0.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/70">
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
              {isPaused ? 'Pausiert' : 'Läuft'}
            </p>
            <p className="truncate text-base font-semibold" title={customerName}>
              {customerName}
            </p>
            <p className="truncate text-xs text-white/70" title={sessionTypeLabel}>
              {sessionTypeLabel}
            </p>
          </div>
          <div
            className={[
              'font-mono text-3xl font-bold tabular-nums',
              isRunning ? 'text-white' : 'text-white/70',
            ].join(' ')}
          >
            {formatHHMMSS(elapsedSeconds)}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {isRunning ? (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 border-white/15 bg-white/10 text-white hover:bg-white/20 sm:flex-none"
                onClick={() => onPause()}
              >
                Pausieren
              </Button>
            ) : (
              <Button size="sm" variant="lime" className="flex-1 sm:flex-none" onClick={() => onResume()}>
                Fortsetzen
              </Button>
            )}
            <Button size="sm" variant="danger" className="flex-1 sm:flex-none" onClick={() => onStop()}>
              Stoppen
            </Button>
          </div>
        </div>
        {/* The minute ring of the big card, as a thin line along the bottom edge. */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <div
            className="h-full bg-accent-lime"
            style={{
              width: `${ringProgress * 100}%`,
              transition: ringJustWrapped ? 'none' : 'width 1s linear',
              boxShadow: isRunning ? '0 0 8px var(--accent-lime)' : 'none',
            }}
          />
        </div>
      </div>
    );
  }

  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);
  const cometAngle = ringProgress * 2 * Math.PI;
  const cometX = 50 + ringRadius * Math.cos(cometAngle);
  const cometY = 50 + ringRadius * Math.sin(cometAngle);

  // Phone: status, ring, buttons stacked. From sm up: the ring on the left, status, names
  // and buttons stacked on its right, which halves the height of the card.
  return (
    <div className="timer-pop-in relative overflow-hidden rounded-3xl bg-accent p-5 text-white sm:px-8">
      {isRunning && (
        <>
          <div className="liquid-blob liquid-blob-lime -left-16 -top-16 h-72 w-72" />
          <div className="liquid-blob liquid-blob-cyan -bottom-20 -right-12 h-80 w-80" />
          <div className="liquid-blob liquid-blob-magenta left-1/3 top-1/2 h-56 w-56" />
        </>
      )}
      <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:grid-rows-[1fr_auto] sm:gap-x-8 sm:gap-y-5">
        <div className="min-w-0 sm:col-start-2 sm:row-start-1 sm:self-end">
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
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
            <span className="truncate">{isPaused ? 'Pausiert' : 'Läuft'}</span>
            {isRunning && (
              <span className="ml-1 flex h-3 shrink-0 items-end gap-[2px]" aria-hidden>
                <span className="eq-bar h-full w-[2px] rounded-full bg-accent-lime" style={{ animationDelay: '0s' }} />
                <span className="eq-bar h-full w-[2px] rounded-full bg-[#38d9e8]" style={{ animationDelay: '0.15s' }} />
                <span className="eq-bar h-full w-[2px] rounded-full bg-accent-lime" style={{ animationDelay: '0.3s' }} />
                <span className="eq-bar h-full w-[2px] rounded-full bg-[#38d9e8]" style={{ animationDelay: '0.45s' }} />
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xl font-bold sm:text-2xl" title={customerName}>
            {customerName}
          </p>
          <p className="truncate text-sm text-white/70" title={sessionTypeLabel}>
            {sessionTypeLabel}
          </p>
          <p className="mt-2 hidden text-sm text-white/60 sm:block">Jede Minute zählt.</p>
        </div>

        <div className="timer-digit-in relative mx-auto flex h-44 w-44 items-center justify-center sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:h-52 sm:w-52">
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
              'relative z-10 text-center font-mono text-3xl font-bold tabular-nums',
              isRunning ? 'neon-digits glitch-jolt text-white' : 'text-white/70',
            ].join(' ')}
          >
            {formatHHMMSS(elapsedSeconds)}
          </div>
        </div>

        <div className="flex gap-2 sm:col-start-2 sm:row-start-2 sm:self-start">
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
