// src/components/home/ChatInputBar.tsx
// Chat input bar — warm editorial.
import React from 'react';
import { FiSend, FiRotateCcw } from 'react-icons/fi';

type ChatInputBarProps = {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onOpen: () => void;
  onReset: () => void;
  showClear: boolean;
};

export default function ChatInputBar({
  input,
  onInputChange,
  onSend,
  onOpen,
  onReset,
  showClear,
}: ChatInputBarProps) {
  return (
    <div className="w-full relative z-30 mt-8 mb-4">
      <div
        className="w-full flex items-center gap-2 p-1.5 min-h-[60px] rounded-[var(--radius-lg)] border cursor-text"
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--border-subtle)',
        }}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      >
        <span
          className="font-mono pl-3 text-lg flex-shrink-0"
          style={{ color: 'var(--fg-4)' }}
        >
          &gt;
        </span>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            className="w-full bg-transparent border-none px-2 py-2.5 focus:outline-none text-sm font-body cursor-text"
            style={{ color: 'var(--fg-1)' } as React.CSSProperties}
            placeholder="Ask about my development work..."
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={onOpen}
            readOnly
            aria-label="Open chat"
          />
        </div>
        {showClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-3)',
              background: 'transparent',
            }}
          >
            <FiRotateCcw size={12} /> CLEAR
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (input.trim()) onSend();
            else onOpen();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border transition-colors"
          style={{
            background: 'var(--fg-1)',
            color: 'var(--bg-1)',
            borderColor: 'var(--fg-1)',
          }}
        >
          SEND <FiSend size={12} />
        </button>
      </div>
    </div>
  );
}
