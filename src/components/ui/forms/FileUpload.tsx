// src/components/ui/forms/FileUpload.tsx
import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import FormField from './FormField';

interface Props {
  id: string;
  label: string;
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** 0-100; renders a progress bar when defined. */
  progress?: number;
}

export default function FileUpload({
  id,
  label,
  onFiles,
  accept,
  multiple,
  hint,
  error,
  disabled,
  progress,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) emit(e.dataTransfer.files);
        }}
        className="border border-dashed p-5 text-center transition-colors"
        style={{
          borderColor: dragging
            ? 'var(--border-strong)'
            : error
            ? 'var(--status-error)'
            : 'var(--border-subtle)',
          background: dragging
            ? 'color-mix(in srgb, var(--fg-3) 6%, transparent)'
            : 'transparent',
          borderRadius: 'var(--radius-lg)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => emit(e.target.files)}
          className="sr-only"
        />
        <UploadCloud
          size={20}
          className="mx-auto mb-2"
          style={{ color: 'var(--fg-3)' }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="font-display text-[10px] tracking-[2px] hover:opacity-70 transition-opacity"
          style={{ color: 'var(--fg-1)' }}
        >
          CHOOSE FILE{multiple ? 'S' : ''}
        </button>
        <p
          className="text-[9px] font-mono mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          or drag &amp; drop here
        </p>

        {typeof progress === 'number' && progress > 0 && progress < 100 && (
          <div
            className="mt-3 h-1 overflow-hidden"
            style={{
              background: 'var(--bg-3)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <div
              className="h-full transition-[width]"
              style={{
                width: `${progress}%`,
                background: 'var(--fg-1)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        )}
      </div>
    </FormField>
  );
}
