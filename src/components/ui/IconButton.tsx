'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'secondary' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  label: string;
}

const variantClasses: Record<Variant, string> = {
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2',
  danger: 'border border-transparent bg-danger/10 text-danger hover:bg-danger hover:text-white',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'secondary', label, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
