// src/components/ui/forms/Toggle.tsx
/* Accessible switch built on a real checkbox input. */

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
      {/* Visually-hidden real input keeps this keyboard- and SR-accessible. */}
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
        className={`relative mt-0.5 w-9 h-5 flex-shrink-0 border transition-colors duration-200 cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-neon-cyan peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-void ${
          checked
            ? 'bg-neon-cyan/25 border-neon-cyan/50'
            : 'bg-white/[0.04] border-white/15'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-[2px] w-3.5 h-3.5 transition-all duration-200 ${
            checked
              ? 'left-[18px] bg-neon-cyan shadow-[0_0_8px_var(--glow-cyan)]'
              : 'left-[2px] bg-text-muted'
          }`}
        />
      </label>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block font-display text-[10px] tracking-[2px] text-text-primary uppercase">
          {label}
        </span>
        {hint && (
          <span className="block text-[9px] font-mono text-text-muted mt-0.5">
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}
