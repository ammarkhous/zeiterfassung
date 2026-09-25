'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TopNav } from '@/components/nav/TopNav';
import { useSync } from '@/hooks/useSync';
import { ToastProvider } from '@/components/ui/Toast';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const { syncStatus } = useSync();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login');
      } else {
        setChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        Laden...
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg">
        <TopNav syncStatus={syncStatus} />
        <main className="pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
