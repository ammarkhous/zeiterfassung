'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/nav/Logo';
import { MfaChallenge } from './MfaChallenge';
import { MfaSetup } from './MfaSetup';

type GateState = 'checking' | 'ready' | 'enroll' | 'challenge' | 'error';

const Screen = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div className="mb-6 flex items-center gap-2.5">
      <Logo className="h-10 w-10 rounded-xl" />
      <span className="text-2xl font-bold tracking-tight text-text">Zeiterfassung</span>
    </div>
    <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="mb-4 text-lg font-bold text-text">{title}</h1>
      {children}
    </div>
  </div>
);

// Everyone must use an authenticator app. This sits between "signed in with a
// password" (assurance level aal1) and the app itself: it asks for the code, or
// makes the user set an authenticator up first, so no data is touched before that.
// The level is read from the stored session, so an already verified session also
// works offline.
export const MfaGate = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [state, setState] = useState<GateState>('checking');

  const check = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data || !data.currentLevel) {
      setState('error');
    } else if (data.currentLevel === 'aal2') {
      setState('ready');
    } else if (data.nextLevel === 'aal2') {
      setState('challenge');
    } else {
      setState('enroll');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // A refreshed token can carry a lower level (for example after an admin reset the
  // authenticator): send the user through the gate again.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') check();
    });
    return () => subscription.unsubscribe();
  }, [check]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (state === 'ready') return <>{children}</>;

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        Laden...
      </div>
    );
  }

  if (state === 'error') {
    return (
      <Screen title="Anmeldestatus nicht verfügbar">
        <p className="mb-4 text-sm text-text">
          Der Anmeldestatus konnte nicht geprüft werden. Bitte die Verbindung prüfen und erneut versuchen.
        </p>
        <div className="flex gap-2">
          <Button fullWidth onClick={check}>
            Erneut versuchen
          </Button>
          <Button variant="secondary" onClick={signOut}>
            Abmelden
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title={state === 'enroll' ? 'Zwei-Faktor-Anmeldung einrichten' : 'Zwei-Faktor-Anmeldung'}>
      {state === 'enroll' && (
        <p className="mb-4 text-sm text-text-muted">
          Aus Sicherheitsgründen ist für alle Benutzer eine Authenticator-App erforderlich. Das
          Einrichten dauert etwa eine Minute.
        </p>
      )}
      {state === 'enroll' ? <MfaSetup onDone={check} /> : <MfaChallenge onDone={check} />}
      <button
        type="button"
        onClick={signOut}
        className="mt-4 w-full text-center text-sm font-semibold text-text-muted hover:text-text hover:underline"
      >
        Abmelden
      </button>
    </Screen>
  );
};
