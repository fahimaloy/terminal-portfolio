// src/components/ui/forms/TextArea.tsx
import React, { useRef } from 'react';
import FormField from './FormField';
import { controlClass } from './TextInput';
import { useFormAnimation } from '../../../hooks/useFormAnimation';

interface Props
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Show a live "n/max" counter (requires maxLength). */
  showCount?: boolean;
}

export default function TextArea({
  id,
  label,
  hint,
  error,
  showCount,
  required,
  className = '',
  style,
  ...rest
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { focusIn, focusOut } = useFormAnimation();

  const length = String(rest.value ?? '').length;
  const counter =
    showCount && rest.maxLength ? `${length}/${rest.maxLength}` : undefined;

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      hint={counter ?? hint}
      error={error}
    >
      <div className="relative" ref={wrapRef}>
        <textarea
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
          className={`${controlClass} resize-none focus:border-[var(--border-strong)] focus:shadow-[0_0_0_3px_var(--border-subtle)] ${className}`}
        />
      </div>
    </FormField>
  );
}
