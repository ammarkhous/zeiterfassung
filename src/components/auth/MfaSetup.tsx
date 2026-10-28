'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { mfaErrorMessage, newFactorName, removeUnverifiedFactors } from '@/lib/mfa';

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

interface MfaSetupProps {
  /** Called once the code was confirmed and the authenticator is active. */
  onDone: () => void;
  onCancel?: () => void;
}

// Sets up an authenticator app: shows a QR code (and the secret for manual entry) and
// asks for the first code to prove the app is working.
export const MfaSetup = ({ onDone, onCancel }: MfaSetupProps) => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  // React runs effects twice in development; one enrollment is enough (and a second
  // one would leave an unconfirmed factor behind).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = async () => {
      try {
        await removeUnverifiedFactors();
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: newFactorName(),
        });
        if (enrollError || !data) throw enrollError ?? new Error('enroll failed');
        setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      } catch (err) {
        console.error('MFA-Einrichtung konnte nicht gestartet werden:', err);
        setError(mfaErrorMessage(err));
      }
    };
    start();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    setError('');
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: code.trim(),
    });
    setVerifying(false);
    if (verifyError) {
      setError(mfaErrorMessage(verifyError));
      setCode('');
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ol className="list-decimal pl-5 text-sm text-text">
        <li className="mb-1">
          Öffnen Sie Ihre Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator,
          Authy oder 1Password) und scannen Sie den QR-Code.
        </li>
        <li>Geben Sie danach den 6-stelligen Code aus der App ein.</li>
      </ol>

      {!enrollment && !error && <p className="text-sm text-text-muted">QR-Code wird erstellt...</p>}

      {enrollment && (
        <div className="flex flex-col items-center gap-2">
          {/* The QR code comes from Supabase as a ready-made image data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="QR-Code zum Einrichten der Authenticator-App"
            className="h-48 w-48 rounded-xl border border-border bg-white p-2"
          />
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            onClick={() => setShowSecret((v) => !v)}
          >
            {showSecret ? 'Geheimen Schlüssel ausblenden' : 'Kein Scan möglich? Schlüssel anzeigen'}
          </button>
          {showSecret && (
            <code
              className="max-w-full break-all rounded-xl bg-surface-2 px-3 py-2 text-center text-sm text-text"
              data-testid="mfa-secret"
            >
              {enrollment.secret}
            </code>
          )}
        </div>
      )}

      <Input
        label="Code aus der App"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={code}
        disabled={!enrollment || verifying}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        fullWidth
      />

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" fullWidth={!onCancel} disabled={!enrollment || verifying || code.length !== 6}>
          {verifying ? 'Wird geprüft...' : 'Bestätigen'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={verifying}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  );
};
