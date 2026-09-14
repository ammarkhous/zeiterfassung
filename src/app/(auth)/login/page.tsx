'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/');
    });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.');
      return;
    }
    router.push('/');
  };

  const handleGithubLogin = async () => {
    setError('');
    setGithubLoading(true);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}${basePath}/` },
    });
    if (authError) {
      setGithubLoading(false);
      setError('GitHub-Anmeldung fehlgeschlagen.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <h1 className="mb-6 text-2xl font-semibold text-text">Zeiterfassung</h1>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-md border border-border bg-surface p-6"
      >
        <div className="mb-4">
          <Input
            label="E-Mail"
            type="email"
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

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">oder</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={githubLoading}
          onClick={handleGithubLogin}
        >
          {githubLoading ? 'Weiterleitung...' : 'Mit GitHub anmelden'}
        </Button>
      </form>
    </div>
  );
}
