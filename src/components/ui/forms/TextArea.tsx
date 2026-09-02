// src/components/ui/forms/TextArea.tsx
/* Themed textarea with focus animation and optional character counter. */

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
          className={`${controlClass} resize-none ${
            error ? 'border-neon-red/50' : ''
          } ${className}`}
        />
      </div>
    </FormField>
  );
}
