'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'lime';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'border border-transparent bg-accent text-white hover:brightness-110 disabled:opacity-50',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2 disabled:opacity-50',
  danger: 'border border-transparent bg-danger text-white hover:brightness-110 disabled:opacity-50',
  ghost: 'border border-transparent bg-transparent text-text hover:bg-surface-2 disabled:opacity-50',
  lime: 'border border-transparent bg-accent-lime text-accent hover:brightness-105 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-1.5',
  md: 'text-base px-5 py-2.5',
  lg: 'text-base px-6 py-3.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'rounded-full font-semibold transition-[background-color,opacity,filter] duration-150 ease-out disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
