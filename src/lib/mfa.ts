import type { Factor } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Two-factor sign-in with authenticator apps (TOTP). The sign-in flow is
// enroll (QR code + secret) -> challenge -> verify; a verified code upgrades the
// session from assurance level aal1 to aal2.

// Verified TOTP factors of the signed-in user (unverified, abandoned ones are not listed).
export const getVerifiedTotp = async (): Promise<Factor[]> => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp;
};

// An enrollment that was started but never confirmed leaves an unverified factor
// behind; a second attempt would then fail on the duplicate name, so clear them first.
export const removeUnverifiedFactors = async (): Promise<void> => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  for (const factor of data.all.filter((f) => f.status === 'unverified')) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
};

// Shown in the security settings list, and must be unique per user, hence the seconds.
export const newFactorName = (): string => {
  const now = new Date();
  const date = now.toLocaleDateString('de-DE');
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `Authenticator ${date} ${time}`;
};

interface AuthLikeError {
  code?: string;
  status?: number;
  message?: string;
}

// German message for a failed enroll / challenge / verify call.
export const mfaErrorMessage = (err: unknown): string => {
  const { code, status, message = '' } = (err ?? {}) as AuthLikeError;
  const lower = message.toLowerCase();

  if (code === 'mfa_verification_failed' || lower.includes('invalid totp') || lower.includes('invalid code')) {
    return 'Der Code ist ungültig oder abgelaufen. Bitte den aktuellen Code aus der App eingeben.';
  }
  if (code === 'over_request_rate_limit' || status === 429 || lower.includes('rate limit')) {
    return 'Zu viele Versuche. Bitte kurz warten und erneut versuchen.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 'Keine Verbindung zum Server. Für diesen Schritt wird eine Internetverbindung benötigt.';
  }
  return 'Das hat nicht geklappt. Bitte erneut versuchen.';
};
