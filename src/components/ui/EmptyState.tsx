import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-dim text-accent">
      {icon}
    </div>
    <p className="text-base font-semibold text-text">{title}</p>
    <p className="max-w-xs text-sm text-text-muted">{description}</p>
    {action}
  </div>
);
