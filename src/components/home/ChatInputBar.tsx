// src/components/home/ChatInputBar.tsx
// Chat command bar — warm editorial + focus glow / press micro-interactions.
//
// THE AFFORDANCE (P3.5): this used to be a `readOnly` <input> carrying the
// placeholder "Type a message…". It could not be typed into, it rendered a
// caret on mobile, and tapping it opened a modal. To a phone user that is a
// text field that silently swallows every keystroke. It is now an honest
// <button>: no caret, no "Type a message…", a visible OPEN affordance with an
// expand icon, and an accessible name that says what activating it does. The
// draft text (`input`) is still displayed, because SEND still sends it — it is
// shown as a DRAFT, not as editable field content.
import React, { useRef, useEffect, useCallback } from 'react';
import { FiSend, FiRotateCcw, FiMaximize2 } from 'react-icons/fi';
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
  /**
   * @deprecated The bar no longer pretends to be a text field, so there is
   * nothing to type into it. The draft is edited in the composer
   * (`MessageOverlay` → `inputValue`/`onInputChange`). The prop is kept so
   * `ChatModalHost` keeps compiling; do not wire it back to a second input.
   */
  onInputChange: (v: string) => void;
  onSend: () => void;
  onOpen: () => void;
  onReset: () => void;
  showClear: boolean;
  /** A request is in flight — SEND goes inert so the bar cannot double-fire. */
  isLoading?: boolean;
};

export default function ChatInputBar({
  input,
  onSend,
  onOpen,
  onReset,
  showClear,
  isLoading = false,
}: ChatInputBarProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const hasDraft = input.trim().length > 0;

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

  // Keyboard shortcuts: / to reach the composer trigger, double Esc to leave it.
  useEffect(() => {
    let lastEsc = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== triggerRef.current) {
        e.preventDefault();
        triggerRef.current?.focus();
        onOpen();
      }
      if (e.key === 'Escape' && document.activeElement === triggerRef.current) {
        const now = Date.now();
        if (now - lastEsc < 350) {
          triggerRef.current?.blur();
        }
        lastEsc = now;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerRef, onOpen]);
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

  // WCAG 2.5.3 Label in Name: the accessible name has to contain the visible
  // label, so it is derived from the same text the button shows rather than
  // being a fixed string that contradicts it.
  const triggerName = hasDraft
    ? `DRAFT: ${input.trim()} — open the message composer to edit it`
    : 'ASK ANYTHING — open the message composer';

  return (
    <div className="w-full relative z-30 mt-[var(--composer-gap)] mb-[var(--composer-inset)]">
      {/* A plain surface, deliberately NOT a control. It was previously an
          onClick div wrapping the <input> and two real <button>s; the trigger
          below now fills it, so the click handler moved onto the button
          itself and the wrapper is just chrome. onFocusCapture still catches
          focus bubbling from any child, so the focus glow is unchanged. */}
      <div
        ref={wrapRef}
        data-chat-inputbar
        className="w-full flex items-center gap-2 p-1.5 min-h-[var(--composer-bar-min)] rounded-[var(--radius-lg)] border"
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--border-subtle)',
        }}
        onFocusCapture={() => animateFocus(true)}
        onBlurCapture={() => animateFocus(false)}
      >
        <span
          aria-hidden="true"
          className="font-mono pl-3 text-lg flex-shrink-0"
          style={{ color: 'var(--fg-3)' }}
        >
          &gt;
        </span>

        <button
          ref={triggerRef}
          type="button"
          onClick={onOpen}
          aria-label={triggerName}
          aria-describedby="chat-input-shortcuts"
          className="group flex-1 min-w-0 flex items-center gap-2 min-h-[44px] px-2 text-left font-body text-sm rounded-[var(--radius-sm)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]"
        >
          {hasDraft ? (
            <>
              <span
                aria-hidden="true"
                className="font-mono text-[10px] tracking-[0.16em] flex-shrink-0"
                style={{ color: 'var(--neon-amber)' }}
              >
                DRAFT
              </span>
              <span
                aria-hidden="true"
                className="truncate"
                style={{ color: 'var(--fg-1)' }}
              >
                {input}
              </span>
            </>
          ) : (
            <span
              aria-hidden="true"
              className="font-mono tracking-[0.14em] truncate"
              style={{ color: 'var(--fg-3)' }}
            >
              ASK ANYTHING
            </span>
          )}

          {/* "Opens a panel", said twice: an icon that means expand, and a
              word. It lives *inside* the button so the whole region is one
              tap target, and it is a <span> with pointer-events-none so it
              neither nests a control in a control nor adds a word to the
              accessible name the trigger already carries. */}
          <span
            aria-hidden="true"
            className="hidden sm:inline-flex ml-auto flex-shrink-0 items-center gap-1.5 min-h-[44px] px-3 font-mono text-[11px] tracking-[0.14em] rounded-[var(--radius-md)] border pointer-events-none"
            style={{
              borderColor: 'var(--glow-cyan-30)',
              color: 'var(--neon-cyan)',
              background: 'var(--wash-cyan)',
            }}
          >
            OPEN <FiMaximize2 size={12} />
          </span>
        </button>

        {showClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-3)',
              background: 'transparent',
            }}
          >
            <FiRotateCcw size={12} aria-hidden="true" /> CLEAR
          </button>
        )}
        <button
          ref={sendRef}
          type="button"
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
          // The bar is always visible, and SEND used to look and behave
          // identically while a request was in flight — so a double tap queued
          // two turns. It now reads as busy and is genuinely inert.
          disabled={isLoading}
          aria-busy={isLoading}
          className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border transition-colors duration-200 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]"
          style={{
            background: 'var(--fg-1)',
            color: 'var(--bg-1)',
            borderColor: 'var(--fg-1)',
          }}
        >
          {isLoading ? 'SENDING' : 'SEND'}{' '}
          {isLoading ? (
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full animate-pulse-soft"
              style={{ background: 'var(--bg-1)' }}
            />
          ) : (
            <FiSend size={12} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* The keyboard shortcuts used to live in the placeholder, where they
          truncated it to "Search tra"-length garbage at 390px. They are
          announced here instead and the visible label stays short. */}
      <span id="chat-input-shortcuts" className="sr-only">
        Press slash to reach the composer, Escape to leave it. This bar is a
        button, not a text field — activating it opens the full message
        composer, where you can type and send.
      </span>
    </div>
  );
}
