import { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'default';

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  success: 'bg-accent-lime-dim text-accent border-transparent',
  warning: 'bg-warning-dim text-warning border-transparent',
  danger: 'bg-danger/10 text-danger border-transparent',
  default: 'bg-surface-2 text-text-muted border-transparent',
};

export const Badge = ({ variant = 'default', children }: BadgeProps) => (
  <span
    className={[
      'inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      variantClasses[variant],
    ].join(' ')}
  >
    {children}
  </span>
);
