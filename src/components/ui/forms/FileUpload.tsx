// src/components/ui/forms/FileUpload.tsx
/* Drag-and-drop file picker with keyboard fallback and optional progress bar. */

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
        className={`clip-notch-sm border border-dashed p-5 text-center transition-colors duration-200 ${
          dragging
            ? 'border-neon-cyan bg-neon-cyan/5'
            : error
            ? 'border-neon-red/50'
            : 'border-white/15 hover:border-white/30'
        } ${disabled ? 'opacity-50' : ''}`}
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
        <UploadCloud size={20} className="mx-auto text-neon-cyan mb-2" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="font-display text-[10px] tracking-[2px] text-neon-cyan hover:text-neon-yellow transition-colors"
        >
          CHOOSE FILE{multiple ? 'S' : ''}
        </button>
        <p className="text-[9px] font-mono text-text-muted mt-1">
          or drag &amp; drop here
        </p>

        {typeof progress === 'number' && progress > 0 && progress < 100 && (
          <div className="mt-3 h-1 bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-neon-cyan transition-[width] duration-200"
              style={{
                width: `${progress}%`,
                boxShadow: '0 0 8px var(--glow-cyan)',
              }}
            />
          </div>
        )}
      </div>
    </FormField>
  );
}
