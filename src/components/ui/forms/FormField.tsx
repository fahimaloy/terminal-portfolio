// src/components/ui/forms/FormField.tsx
import React from 'react';

interface Props {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  id,
  label,
  required,
  hint,
  error,
  children,
  className = '',
}: Props) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[9px] font-display tracking-[3px] mb-1.5 uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: 'var(--status-error)' }}>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p
          className="text-[9px] font-mono mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="text-[9px] font-mono mt-1"
          style={{ color: 'var(--status-error)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
