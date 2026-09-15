'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, fullWidth = false, className = '', id, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={selectId} className="block mb-1 text-sm text-text-muted">
            {label}
          </label>
        )}
        <div className={['relative', fullWidth ? 'w-full' : ''].join(' ')}>
          <select
            ref={ref}
            id={selectId}
            className={[
              'appearance-none bg-surface border rounded-md px-3 py-2 pr-8 text-sm text-text outline-none transition-[border-color,box-shadow] duration-150 ease-out',
              'focus:border-accent focus:ring-1 focus:ring-accent',
              error ? 'border-danger' : 'border-border',
              fullWidth ? 'w-full' : '',
              className,
            ].join(' ')}
            {...props}
          >
            {children}
          </select>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          >
            <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
