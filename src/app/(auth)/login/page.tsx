'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/nav/Logo';
import { identifierToEmail } from '@/lib/auth';
import { LOGIN_NOTICE_KEY } from '@/hooks/useProfile';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/');
    });

    // Reason for a forced sign-out (disabled account, no access), if any.
    try {
      const stored = sessionStorage.getItem(LOGIN_NOTICE_KEY);
      if (stored) {
        setNotice(stored);
        sessionStorage.removeItem(LOGIN_NOTICE_KEY);
      }
    } catch {
      // storage unavailable: no notice
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: identifierToEmail(email),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(
        authError.message.toLowerCase().includes('banned')
          ? 'Dieses Konto wurde deaktiviert.'
          : 'Anmeldung fehlgeschlagen. Bitte Benutzername/E-Mail und Passwort prüfen.'
      );
      return;
    }
    router.push('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="mb-6 flex items-center gap-2.5">
        <Logo className="h-10 w-10 rounded-xl" />
        <span className="text-2xl font-bold tracking-tight text-text">Zeiterfassung</span>
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="mb-4">
          <Input
            label="Benutzername oder E-Mail"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Input
            label="Passwort"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Wird angemeldet...' : 'Anmelden'}
        </Button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {notice && <p className="mt-3 text-sm text-warning">{notice}</p>}
      </form>
    </div>
  );
}
