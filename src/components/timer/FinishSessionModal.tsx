'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SessionExtras, TimerView } from '@/hooks/useTimers';
import { DraftMaterial, MaterialFahrtFields } from '@/components/entry/MaterialFahrtFields';
import { normalizeMaterials, parseKm } from '@/lib/materials';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';

interface FinishSessionModalProps {
  timer: TimerView;
  customerName: string;
  sessionTypeLabel: string;
  onSave: (minutes: number, notes: string, extras: SessionExtras) => Promise<void>;
  onDiscard: () => Promise<void>;
}

const noop = () => {};

// The step after "Stoppen": a focused dialog over a dimmed page instead of one more card
// in the list. It cannot be dismissed by accident (a stopped timer survives a reload, so
// nothing is lost either way); the only ways out are Speichern and Verwerfen.
export const FinishSessionModal = ({
  timer,
  customerName,
  sessionTypeLabel,
  onSave,
  onDiscard,
}: FinishSessionModalProps) => {
  const { showToast } = useToast();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Optional on-site extras; like the note, only kept while this dialog is open.
  const [materials, setMaterials] = useState<DraftMaterial[]>([]);
  const [kmText, setKmText] = useState('');
  const [kmError, setKmError] = useState<string | undefined>();
  const [extrasOpen, setExtrasOpen] = useState(false);

  const minutes = timer.frozen_minutes ?? 1;
  const extrasCount = materials.filter((m) => m.name.trim()).length + (kmText.trim() ? 1 : 0);

  const handleSave = async () => {
    const km = parseKm(kmText);
    if (!km.ok) {
      setKmError(km.error);
      setExtrasOpen(true);
      return;
    }
    setKmError(undefined);

    setSaving(true);
    await onSave(minutes, notes, { materials: normalizeMaterials(materials), travel_km: km.km });
    setSaving(false);
    showToast('Session gespeichert', 'success');
  };

  const handleDiscard = async () => {
    setSaving(true);
    await onDiscard();
    setSaving(false);
    showToast('Session verworfen');
  };

  return (
    <Modal open onClose={noop} dismissible={false}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Fast geschafft</p>
      <h2 className="mb-4 text-xl font-bold text-text">Session abschließen</h2>

      <div className="mb-5 rounded-2xl bg-accent p-4 text-white">
        <p
          className="mb-1 truncate text-xs font-semibold uppercase tracking-wide text-white/70"
          title={`${customerName} · ${sessionTypeLabel}`}
        >
          {customerName} · {sessionTypeLabel}
        </p>
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{minutesToAE(minutes).toFixed(1)} AE</span>
          <span className="text-sm text-white/70">{minutesToHHMM(minutes)}h</span>
        </p>
      </div>

      <label className="mb-5 block">
        <span className="mb-1 block text-sm font-semibold text-text">Notizen / Beschreibung</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Was wurde gemacht? (optional)"
          rows={4}
          disabled={saving}
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60"
        />
        <span className="mt-1 block text-xs text-text-muted">
          Erscheint im Bericht. Aufzählungen mit - oder * werden automatisch geordnet.
        </span>
      </label>

      <details
        open={extrasOpen}
        onToggle={(e) => setExtrasOpen(e.currentTarget.open)}
        className="mb-5 rounded-2xl border border-border bg-surface-2"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-text">
          <span>
            Material &amp; Fahrt <span className="font-normal text-text-muted">(optional)</span>
            {extrasCount > 0 && <span className="ml-2 font-normal text-text-muted">· {extrasCount} erfasst</span>}
          </span>
          <span aria-hidden className={`text-text-muted transition-transform ${extrasOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </summary>
        <div className="px-4 pt-1">
          <MaterialFahrtFields
            materials={materials}
            onMaterialsChange={setMaterials}
            kmText={kmText}
            onKmTextChange={(text) => {
              setKmText(text);
              setKmError(undefined);
            }}
            kmError={kmError}
            disabled={saving}
          />
        </div>
      </details>

      {confirmDiscard ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="mb-3 text-sm text-text">
            Session wirklich verwerfen? Die erfasste Zeit ({minutesToAE(minutes).toFixed(1)} AE) geht verloren.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleDiscard} disabled={saving}>
              Ja, verwerfen
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDiscard(false)} disabled={saving}>
              Zurück
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmDiscard(true)} disabled={saving}>
            Verwerfen
          </Button>
          <Button size="lg" onClick={handleSave} disabled={saving} className="sm:min-w-48">
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      )}
    </Modal>
  );
};
