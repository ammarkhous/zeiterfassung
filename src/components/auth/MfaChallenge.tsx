'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getVerifiedTotp, mfaErrorMessage } from '@/lib/mfa';

interface MfaChallengeProps {
  /** Called once the code was accepted and the session is upgraded. */
  onDone: () => void;
}

// Asks for the current code of the user's authenticator app after the password step.
export const MfaChallenge = ({ onDone }: MfaChallengeProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const [factor] = await getVerifiedTotp();
      if (!factor) throw new Error('no verified factor');
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      onDone();
    } catch (err) {
      setError(mfaErrorMessage(err));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-text">
        Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
      </p>
      <Input
        label="Code aus der App"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={code}
        disabled={verifying}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        autoFocus
        fullWidth
      />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={verifying || code.length !== 6}>
        {verifying ? 'Wird geprüft...' : 'Bestätigen'}
      </Button>
    </form>
  );
};
