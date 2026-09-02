// src/components/ui/forms/FormField.tsx
/* Shared label + error + hint wrapper so every admin control is consistent
   and accessible (label bound via htmlFor, error announced via role=alert). */

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
        className="block text-[9px] font-display tracking-[3px] text-text-muted mb-1.5 uppercase"
      >
        {label}
        {required && <span className="text-neon-red ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[9px] font-mono text-text-muted mt-1">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-[9px] font-mono text-neon-red mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
