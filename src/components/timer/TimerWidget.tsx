'use client';

import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { SessionExtras, useTimers } from '@/hooks/useTimers';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useProfile } from '@/hooks/useProfile';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { SignatureModal, CapturedSignatures } from '@/components/signature/SignatureModal';
import { TimeEntry } from '@/types';
import { TimerCard } from './TimerCard';

const darkFieldClass =
  'border-white/15 bg-white/10 text-white placeholder:text-white/50 focus:border-accent-lime focus:ring-accent-lime';

export const TimerWidget = () => {
  const { customers, activeCustomers } = useCustomers();
  const { sessionTypes } = useSessionTypes();
  const { timers, startTimer, pauseTimer, resumeTimer, stopTimer, saveSession, discardSession } =
    useTimers();
  const { updateEntry } = useTimeEntries();
  const { username, email } = useProfile();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState('');
  const [sessionTypeId, setSessionTypeId] = useState('');
  // The just-saved session waiting for its (optional) signatures. Lives here, not
  // in TimerCard, because the card unmounts as soon as its timer is saved.
  const [signingEntry, setSigningEntry] = useState<TimeEntry | null>(null);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? '...';
  const sessionTypeLabel = (id: string) => sessionTypes.find((s) => s.id === id)?.label ?? '...';

  const handleStart = async () => {
    if (!customerId || !sessionTypeId) return;
    await startTimer(customerId, sessionTypeId);
    // Keep the customer selected: a second session for the same customer is common.
    setSessionTypeId('');
  };

  const handleSave = async (key: string, minutes: number, notes: string, extras: SessionExtras) => {
    const entry = await saveSession(key, minutes, notes, extras);
    if (entry) setSigningEntry(entry);
  };

  const handleSignaturesDone = async (signatures: CapturedSignatures | null) => {
    const entry = signingEntry;
    setSigningEntry(null);
    // Everything skipped: the session is already saved as it is.
    if (!entry || !signatures) return;
    await updateEntry(entry.id, {
      technician_signature: signatures.technician,
      customer_signature: signatures.customer,
      signed_at: new Date().toISOString(),
    });
    showToast('Unterschriften gespeichert', 'success');
  };

  const hasTimers = timers.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {timers.map((timer) => (
        <TimerCard
          key={timer.key}
          timer={timer}
          customerName={customerName(timer.customer_id)}
          sessionTypeLabel={sessionTypeLabel(timer.session_type_id)}
          onPause={() => pauseTimer(timer.key)}
          onResume={() => resumeTimer(timer.key)}
          onStop={() => stopTimer(timer.key)}
          onSave={(minutes, notes, extras) => handleSave(timer.key, minutes, notes, extras)}
          onDiscard={() => discardSession(timer.key)}
        />
      ))}

      <div className="rounded-3xl bg-accent p-6 text-white">
        <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-lime" />
            {hasTimers ? 'Weiteren Timer starten' : 'Bereit, wenn Sie es sind'}
          </span>
        </div>
        {!hasTimers && (
          <div className="mb-6 text-center font-mono text-5xl font-bold tabular-nums text-white/30 sm:text-6xl">
            00:00:00
          </div>
        )}
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

      {signingEntry && (
        <SignatureModal
          key={signingEntry.id}
          entry={signingEntry}
          customerName={customerName(signingEntry.customer_id)}
          sessionTypeLabel={sessionTypeLabel(signingEntry.session_type_id)}
          technicianName={username ?? email ?? 'Techniker'}
          onFinish={handleSignaturesDone}
        />
      )}
    </div>
  );
};
