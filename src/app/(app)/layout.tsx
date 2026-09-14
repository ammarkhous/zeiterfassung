'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/nav/Sidebar';
import { BottomNav } from '@/components/nav/BottomNav';
import { SyncStatus } from '@/components/nav/SyncStatus';
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
        <Sidebar syncStatus={syncStatus} />
        <div className="flex items-center justify-end border-b border-border px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:hidden">
          <SyncStatus status={syncStatus} />
        </div>
        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:ml-60 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
