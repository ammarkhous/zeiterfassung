'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, PlusCircleIcon, ListIcon, BarChartIcon, GearIcon } from './icons';

const navItems = [
  { label: 'Dashboard', href: '/', icon: HouseIcon },
  { label: 'Neu', href: '/new-entry', icon: PlusCircleIcon },
  { label: 'Sessions', href: '/sessions', icon: ListIcon },
  { label: 'Report', href: '/report', icon: BarChartIcon },
  { label: 'Einstellungen', href: '/settings', icon: GearIcon },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-40 flex w-full border-t border-border bg-surface md:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors duration-150 ease-out',
              active ? 'text-accent' : 'text-text-muted',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
