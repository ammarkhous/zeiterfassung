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
        <select
          ref={ref}
          id={selectId}
          className={[
            'bg-surface border rounded-md px-3 py-2 text-sm text-text outline-none transition-[border-color,box-shadow] duration-150 ease-out',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            error ? 'border-danger' : 'border-border',
            fullWidth ? 'w-full' : '',
            className,
          ].join(' ')}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
