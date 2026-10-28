'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Factor } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { MfaSetup } from '@/components/auth/MfaSetup';
import { getVerifiedTotp, mfaErrorMessage } from '@/lib/mfa';

// Settings section "Sicherheit": the user's authenticator apps. Another device can be
// added while the old one still works, and one can be removed, but never the last
// one (everybody must keep at least one authenticator).
export const SecuritySettings = () => {
  const { showToast } = useToast();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Factor | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setFactors(await getVerifiedTotp());
      setLoadError('');
    } catch (err) {
      setLoadError(mfaErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: removeTarget.id });
    setBusy(false);
    if (error) {
      showToast(mfaErrorMessage(error), 'error');
      return;
    }
    setRemoveTarget(null);
    showToast('Authenticator entfernt', 'success');
    reload();
  };

  const onlyOne = (factors?.length ?? 0) <= 1;

  return (
    <section>
      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Ihr Konto
        </p>
        <h2 className="text-xl font-bold text-text">Sicherheit</h2>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-text">Zwei-Faktor-Anmeldung</h3>
          <Badge variant={factors && factors.length > 0 ? 'success' : 'warning'}>
            {factors && factors.length > 0 ? 'Aktiv' : 'Nicht eingerichtet'}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-text-muted">
          Bei jeder Anmeldung wird zusätzlich ein Code aus Ihrer Authenticator-App abgefragt.
        </p>

        {loadError && <p className="mb-3 text-sm text-danger">{loadError}</p>}

        {factors && factors.length > 0 && (
          <ul className="mb-4 overflow-hidden rounded-2xl border border-border">
            {factors.map((factor) => (
              <li
                key={factor.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text" title={factor.friendly_name}>
                    {factor.friendly_name ?? 'Authenticator'}
                  </p>
                  <p className="text-xs text-text-muted">
                    Eingerichtet am {new Date(factor.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={onlyOne}
                  title={onlyOne ? 'Mindestens ein Authenticator ist erforderlich' : undefined}
                  onClick={() => setRemoveTarget(factor)}
                >
                  Entfernen
                </Button>
              </li>
            ))}
          </ul>
        )}

        {onlyOne && factors && factors.length > 0 && (
          <p className="mb-4 text-xs text-text-muted">
            Mindestens ein Authenticator ist erforderlich. Um das Gerät zu wechseln, fügen Sie zuerst
            das neue Gerät hinzu und entfernen Sie danach das alte.
          </p>
        )}

        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          + Weiteres Gerät hinzufügen
        </Button>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Authenticator hinzufügen" dismissible={false}>
        <MfaSetup
          onDone={() => {
            setAdding(false);
            showToast('Authenticator hinzugefügt', 'success');
            reload();
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Authenticator entfernen">
        <p className="mb-4 text-sm text-text">
          Der Authenticator <span className="font-semibold">{removeTarget?.friendly_name}</span> wird
          entfernt. Codes aus diesem Gerät funktionieren danach nicht mehr.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleRemove} disabled={busy}>
            Entfernen
          </Button>
          <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
            Abbrechen
          </Button>
        </div>
      </Modal>
    </section>
  );
};
