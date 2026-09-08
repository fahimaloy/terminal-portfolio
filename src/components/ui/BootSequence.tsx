// src/components/ui/BootSequence.tsx
/* Minimal editorial boot — 600ms fade, respects sessionStorage skip + reduced motion. */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { animate, createScope } from 'animejs';
import { durations, easings, isReducedMotion } from '../../config/animations';

const STORAGE_KEY = 'cyberpunk-boot-shown';
const TOTAL_MS = 600;
const SKIPPABLE_AFTER_MS = 150;

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const mountTime = useRef<number>(Date.now());

  const finish = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
    if (rootRef.current) rootRef.current.style.opacity = '';
    setShow(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  }, []);

  const skip = useCallback(() => {
    if (!show) return;
    if (Date.now() - mountTime.current < SKIPPABLE_AFTER_MS) return;
    finish();
  }, [show, finish]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const reduced = isReducedMotion();
    setShow(true);
    mountTime.current = Date.now();

    if (reduced) {
      const t = setTimeout(finish, 120);
      return () => clearTimeout(t);
    }
    // Main fade handled in next effect once root is mounted (show=true)
    return undefined;
  }, [finish]);

  // Animate once the overlay is in the DOM
  useEffect(() => {
    if (!show || !rootRef.current || isReducedMotion()) return;
    const root = rootRef.current;
    const scope = createScope({ root });
    scopeRef.current = scope;

    scope.add(() => {
      const inner = root.querySelector<HTMLElement>('.boot-inner');
      if (inner) {
        animate(inner, {
          opacity: [0, 1],
          y: [8, 0],
          duration: Math.min(TOTAL_MS - 120, durations.enter * 1000),
          ease: easings.expoOut,
        });
      }
      // Auto-dismiss after TOTAL_MS via fade-out on root
      const t = window.setTimeout(() => {
        animate(root, {
          opacity: [1, 0],
          duration: 220,
          ease: easings.expoIn ?? easings.in,
        }).then(() => finish());
      }, TOTAL_MS - 220);
      // Cleanup timeout if unmounted early
      (scope as unknown as { _bootTimer?: number })._bootTimer =
        t as unknown as number;
    });

    return () => {
      const maybe = scope as unknown as { _bootTimer?: number };
      if (maybe._bootTimer) window.clearTimeout(maybe._bootTimer);
      scope.revert();
      scopeRef.current = null;
      if (root) root.style.opacity = '';
    };
  }, [show, finish]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent | MouseEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      skip();
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('click', handler);
    };
  }, [show, skip]);

  if (!show) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-1)', color: 'var(--fg-1)' }}
    >
      <div className="boot-inner opacity-0">
        <div
          className="font-display text-3xl md:text-4xl tracking-[0.18em] text-center"
          style={{ color: 'var(--fg-1)' }}
        >
          FAHIM
        </div>
        <div
          className="mt-3 h-px w-24 mx-auto opacity-40"
          style={{ background: 'var(--border-subtle)' }}
        />
        <div
          className="mt-3 font-mono text-[10px] tracking-[0.22em] text-center uppercase"
          style={{ color: 'var(--fg-3)' }}
        >
          Portfolio
        </div>
      </div>
    </div>
  );
}
