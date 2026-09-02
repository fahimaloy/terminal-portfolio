// src/components/ui/forms/TextInput.tsx
/* Themed text input with anime.js focus scale. */

import React, { useRef } from 'react';
import FormField from './FormField';
import { useFormAnimation } from '../../../hooks/useFormAnimation';

export const controlClass =
  'w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2.5 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted transition-all duration-200 clip-notch-sm disabled:opacity-50';

interface Props
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function TextInput({
  id,
  label,
  hint,
  error,
  icon,
  required,
  className = '',
  ...rest
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { focusIn, focusOut } = useFormAnimation();

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      <div className="relative" ref={wrapRef}>
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...rest}
          id={id}
          required={required}
          aria-invalid={Boolean(error)}
          onFocus={(e) => {
            focusIn(wrapRef.current);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            focusOut(wrapRef.current);
            rest.onBlur?.(e);
          }}
          className={`${controlClass} ${icon ? 'pl-10' : ''} ${
            error ? 'border-neon-red/50' : ''
          } ${className}`}
        />
      </div>
    </FormField>
  );
}
