'use client';

import { SyncStatus as SyncStatusType } from '@/types';

interface SyncStatusProps {
  status: SyncStatusType;
}

const config: Record<SyncStatusType, { label: string; dotClass: string; spin?: boolean }> = {
  synced: { label: 'Synchronisiert', dotClass: 'bg-success' },
  syncing: { label: 'Synchronisiere...', dotClass: 'bg-accent', spin: true },
  offline: { label: 'Offline', dotClass: 'bg-warning' },
  error: { label: 'Sync-Fehler', dotClass: 'bg-danger' },
};

export const SyncStatus = ({ status }: SyncStatusProps) => {
  const { label, dotClass, spin } = config[status];
  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span
        className={[
          'inline-block h-2 w-2 rounded-full',
          dotClass,
          spin ? 'animate-spin' : '',
        ].join(' ')}
      />
      <span>{label}</span>
    </div>
  );
};
