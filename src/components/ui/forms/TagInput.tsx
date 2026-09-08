// src/components/ui/forms/TagInput.tsx
import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import FormField from './FormField';
import { controlClass } from './TextInput';
import NeonChip from '../NeonChip';
import { canAnimate, durations, easings } from '../../../config/animations';

interface Props {
  id: string;
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Lowercase every tag (default true, keeps filtering consistent). */
  lowercase?: boolean;
}

export default function TagInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder = 'Type and press Enter',
  disabled,
  lowercase = true,
}: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(value.length);

  useEffect(() => {
    if (value.length > prevCount.current && listRef.current && canAnimate()) {
      const chips = listRef.current.children;
      const last = chips[chips.length - 1];
      if (last) {
        animate(last, {
          opacity: [0, 1],
          scale: [0.7, 1],
          duration: durations.hover * 1000 + 60,
          ease: easings.expoOut,
        });
      }
    }
    prevCount.current = value.length;
  }, [value.length]);

  const add = () => {
    const raw = draft.trim();
    if (!raw) return;
    const next = lowercase ? raw.toLowerCase() : raw;
    if (!value.includes(next)) onChange([...value, next]);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
      return;
    }
    if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={add}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        style={{
          background: 'var(--bg-3)',
          border: `1px solid ${
            error ? 'var(--status-error)' : 'var(--border-subtle)'
          }`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--fg-1)',
        }}
        className={`${controlClass} focus:border-[var(--border-strong)] focus:shadow-[0_0_0_3px_var(--border-subtle)]`}
      />
      {value.length > 0 && (
        <div ref={listRef} className="flex flex-wrap gap-1.5 mt-2">
          {value.map((tag) => (
            <NeonChip
              key={tag}
              accent="cyan"
              removable
              onRemove={() => onChange(value.filter((t) => t !== tag))}
            >
              {tag.toUpperCase()}
            </NeonChip>
          ))}
        </div>
      )}
    </FormField>
  );
}
