// src/components/ui/forms/TextInput.tsx
import React, { useRef } from 'react';
import FormField from './FormField';
import { useFormAnimation } from '../../../hooks/useFormAnimation';

export const controlClass =
  'w-full px-3 py-2.5 font-body text-sm focus:outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50 transition-colors';

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
  style,
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
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--fg-3)' }}
          >
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
          style={
            {
              background: 'var(--bg-3)',
              border: `1px solid ${
                error ? 'var(--status-error)' : 'var(--border-subtle)'
              }`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--fg-1)',
              ...style,
            } as React.CSSProperties
          }
          className={`${controlClass} ${
            icon ? 'pl-10' : ''
          } focus:border-[var(--border-strong)] focus:shadow-[0_0_0_3px_var(--border-subtle)] ${className}`}
        />
      </div>
    </FormField>
  );
}
