// src/components/ui/forms/Toggle.tsx — editorial switch
import React from 'react';

interface Props {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

export default function Toggle({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled,
}: Props) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <label
        htmlFor={id}
        className={`relative mt-0.5 w-9 h-5 flex-shrink-0 border transition-colors cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--border-strong)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-1)] ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          background: checked ? 'var(--fg-1)' : 'var(--bg-3)',
          borderColor: checked
            ? 'var(--border-strong)'
            : 'var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
        }}
      >
        <span
          className="absolute top-[2px] w-3.5 h-3.5 transition-all"
          style={{
            left: checked ? '18px' : '2px',
            background: checked ? 'var(--bg-1)' : 'var(--fg-1)',
            borderRadius: 'var(--radius-full)',
          }}
        />
      </label>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span
          className="block font-display text-[10px] tracking-[2px] uppercase"
          style={{ color: 'var(--fg-1)' }}
        >
          {label}
        </span>
        {hint && (
          <span
            className="block text-[9px] font-mono mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}
