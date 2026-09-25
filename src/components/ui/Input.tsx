'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={inputId} className="block mb-1 text-sm text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'bg-surface border rounded-xl px-4 py-2.5 text-base text-text placeholder:text-text-muted outline-none transition-[border-color,box-shadow] duration-150 ease-out',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            error ? 'border-danger' : 'border-border',
            fullWidth ? 'w-full' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
