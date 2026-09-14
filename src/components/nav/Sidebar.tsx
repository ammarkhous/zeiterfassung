'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SyncStatus } from './SyncStatus';
import { SyncStatus as SyncStatusType } from '@/types';
import {
  HouseIcon,
  PlusCircleIcon,
  ListIcon,
  BarChartIcon,
  GearIcon,
  LogoutIcon,
} from './icons';

const navItems = [
  { label: 'Dashboard', href: '/', icon: HouseIcon },
  { label: 'Neue Erfassung', href: '/new-entry', icon: PlusCircleIcon },
  { label: 'Sessions', href: '/sessions', icon: ListIcon },
  { label: 'Monatsreport', href: '/report', icon: BarChartIcon },
  { label: 'Einstellungen', href: '/settings', icon: GearIcon },
];

interface SidebarProps {
  syncStatus: SyncStatusType;
}

export const Sidebar = ({ syncStatus }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-border bg-surface md:flex">
      <div className="px-4 py-5 text-lg font-semibold text-text">Zeiterfassung</div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ease-out',
                active
                  ? 'bg-accent-dim text-accent'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={handleLogout}
          className="mb-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-danger"
        >
          <LogoutIcon className="h-4 w-4" />
          Abmelden
        </button>
        <div className="px-3">
          <SyncStatus status={syncStatus} />
        </div>
      </div>
    </aside>
  );
};
