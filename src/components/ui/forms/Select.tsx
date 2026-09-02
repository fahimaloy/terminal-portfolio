// src/components/ui/forms/Select.tsx
/* Themed select. Deliberately wraps a native <select> rather than a div-based
   listbox: keyboard nav, screen readers, and mobile pickers all work for free. */

import React, { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import FormField from './FormField';
import { controlClass } from './TextInput';
import { useFormAnimation } from '../../../hooks/useFormAnimation';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string;
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  placeholder?: string;
}

export default function Select({
  id,
  label,
  options,
  hint,
  error,
  placeholder,
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
        <select
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
          className={`${controlClass} appearance-none pr-9 cursor-pointer ${
            error ? 'border-neon-red/50' : ''
          } ${className}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-cyan pointer-events-none"
        />
      </div>
    </FormField>
  );
}
