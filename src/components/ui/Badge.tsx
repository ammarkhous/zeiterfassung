import { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'default';

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  default: 'bg-surface-2 text-text-muted border-border',
};

export const Badge = ({ variant = 'default', children }: BadgeProps) => (
  <span
    className={[
      'inline-block rounded-md border px-2 py-0.5 text-xs font-medium',
      variantClasses[variant],
    ].join(' ')}
  >
    {children}
  </span>
);
