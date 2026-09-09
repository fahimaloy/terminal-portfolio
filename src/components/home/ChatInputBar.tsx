// src/components/home/ChatInputBar.tsx
// Chat input bar — warm editorial + focus glow / press micro-interactions.
import React, { useRef, useEffect, useCallback } from 'react';
import { FiSend, FiRotateCcw } from 'react-icons/fi';
import { createScope, animate, spring } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';

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
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    const root = wrapRef.current?.parentElement ?? wrapRef.current;
    if (!root || typeof window === 'undefined') return;
    if (isReducedMotion() || !canAnimate()) return;
    const scope = createScope({ root: root as HTMLElement });
    scopeRef.current = scope;
    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, []);

  const animateFocus = useCallback((focused: boolean) => {
    const el = wrapRef.current;
    if (!el || isReducedMotion() || !canAnimate()) return;
    const softSpring = spring(
      springs.soft as unknown as Record<string, number>,
    ) as unknown as string;
    const smoothEase = (easings.smooth as unknown as string) ?? 'linear';
    if (focused) {
      const anim = () =>
        (animate as any)(el, {
          borderColor: 'var(--border-strong)',
          boxShadow:
            '0 0 0 1px var(--border-strong), 0 0 16px var(--glow-cyan-sm)',
          duration: durations.hover * 1000,
          ease: softSpring ?? smoothEase,
        });
      if (scopeRef.current) scopeRef.current.add(anim);
      else anim();
    } else {
      const anim = () =>
        (animate as any)(el, {
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 0 0 0 var(--glow-cyan-sm)',
          duration: durations.hover * 1000,
          ease: smoothEase,
        });
      if (scopeRef.current) scopeRef.current.add(anim);
      else anim();
    }
  }, []);

  const handlePressDown = useCallback(() => {
    const btn = sendRef.current;
    if (!btn || isReducedMotion() || !canAnimate()) return;
    const hard = springs.hard as unknown as Record<string, number>;
    const easing =
      (spring(hard) as unknown as string) ??
      (easings.smooth as unknown as string);
    const anim = () =>
      (animate as any)(btn, {
        scale: 0.96,
        duration: durations.tap * 1000,
        ease: easing,
        composition: 'blend',
      });
    if (scopeRef.current) scopeRef.current.add(anim);
    else anim();
  }, []);

  const handlePressUp = useCallback(() => {
    const btn = sendRef.current;
    if (!btn || isReducedMotion() || !canAnimate()) return;
    const bouncy = springs.bouncy as unknown as Record<string, number>;
    const easing =
      (spring(bouncy) as unknown as string) ??
      (easings.smooth as unknown as string);
    const anim = () =>
      (animate as any)(btn, {
        scale: 1,
        duration: durations.tap * 1000 * 1.2,
        ease: easing,
        composition: 'blend',
      });
    if (scopeRef.current) scopeRef.current.add(anim);
    else anim();
  }, []);

  return (
    <div className="w-full relative z-30 mt-8 mb-4">
      <div
        ref={wrapRef}
        className="w-full flex items-center gap-2 p-1.5 min-h-[60px] rounded-[var(--radius-lg)] border cursor-text"
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--border-subtle)',
        }}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
        onFocusCapture={() => animateFocus(true)}
        onBlurCapture={() => animateFocus(false)}
      >
        <span
          className="font-mono pl-3 text-lg flex-shrink-0"
          style={{ color: 'var(--fg-4)' }}
        >
          &gt;
        </span>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none px-2 py-2.5 focus:outline-none text-sm font-body cursor-text"
            style={{ color: 'var(--fg-1)' } as React.CSSProperties}
            placeholder="Ask about my development work..."
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => {
              animateFocus(true);
              onOpen();
            }}
            onBlur={() => animateFocus(false)}
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
          ref={sendRef}
          onClick={(e) => {
            e.stopPropagation();
            if (input.trim()) onSend();
            else onOpen();
          }}
          onMouseDown={handlePressDown}
          onMouseUp={handlePressUp}
          onMouseLeave={handlePressUp}
          onTouchStart={handlePressDown}
          onTouchEnd={handlePressUp}
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
