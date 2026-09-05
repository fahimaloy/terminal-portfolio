// src/components/home/ChatInputBar.tsx
// Chat input bar with send/clear buttons and ripple effect.
import React from 'react';
import { FiSend, FiRotateCcw } from 'react-icons/fi';
import { HudPanel, NeonButton, Ripple } from '../ui';

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
      <Ripple className="clip-notch-md w-full" color="var(--glow-yellow-soft)">
        <HudPanel
          accent="yellow"
          notch="md"
          className="p-1.5 flex items-center gap-2 cursor-text hud-glow-yellow w-full min-h-[60px]"
          innerClassName="w-full"
          onClick={onOpen}
        >
          <span className="font-display text-neon-yellow text-shadow-neon-yellow pl-3 text-lg flex-shrink-0">
            &gt;
          </span>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              className="w-full bg-transparent border-none text-text-primary px-2 py-2.5 focus:outline-none placeholder-text-muted text-sm font-body cursor-text focus:shadow-[0_0_12px_var(--glow-yellow)] transition-all duration-200"
              placeholder="Ask about my development work..."
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={onOpen}
              readOnly
              aria-label="Open chat"
            />
          </div>
          {showClear && (
            <NeonButton
              variant="ghost"
              accent="cyan"
              iconLeft={<FiRotateCcw />}
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
            >
              CLEAR
            </NeonButton>
          )}
          <NeonButton
            accent="yellow"
            iconRight={<FiSend />}
            onClick={(e) => {
              e.stopPropagation();
              if (input.trim()) onSend();
              else onOpen();
            }}
          >
            SEND
          </NeonButton>
        </HudPanel>
      </Ripple>
    </div>
  );
}
