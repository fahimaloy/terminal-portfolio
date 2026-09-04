// src/components/ui/BootSequence.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   BOOT SEQUENCE — animejs.com-style splash
   Clean, minimal entrance: wordmark draw → glow pulse → fade.
   ~2s total. Skippable after 600ms. Respects reduced motion.
══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createTimeline, createScope, spring } from 'animejs';
import { isReducedMotion } from '../../config/animations';

const STORAGE_KEY = 'cyberpunk-boot-shown';
const TOTAL_MS = 2200;
const SKIPPABLE_AFTER_MS = 600;

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const mountTime = useRef<number>(Date.now());

  const skip = useCallback(() => {
    if (!show) return;
    if (Date.now() - mountTime.current < SKIPPABLE_AFTER_MS) return;
    scopeRef.current?.revert();
    if (rootRef.current) rootRef.current.style.opacity = '';
    setShow(false);
    try { window.sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }, [show]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;

    const reduced = isReducedMotion();
    setShow(true);
    mountTime.current = Date.now();

    if (reduced) {
      const t = setTimeout(() => {
        setShow(false);
        try { window.sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
      }, 200);
      return () => clearTimeout(t);
    }

    if (!rootRef.current) return;

    const scope = createScope({ root: rootRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const tl = createTimeline({
        defaults: { ease: 'outExpo' },
        onComplete: () => {
          setShow(false);
          try { window.sessionStorage.setItem(STORAGE_KEY, '1'); } catch {}
        },
      });

      // 1. Wordmark letters stagger in with spring
      const letters = rootRef.current!.querySelectorAll('.boot-letter');
      if (letters.length) {
        tl.add(letters, {
          opacity: [0, 1],
          y: [30, 0],
          rotateX: [-40, 0],
          ...spring({ stiffness: 120, damping: 14 }),
          delay: (i: number) => i * 60,
        }, 0);
      }

      // 2. Underline draws in
      const underline = rootRef.current!.querySelector('.boot-underline');
      if (underline) {
        tl.add(underline, {
          scaleX: [0, 1],
          opacity: [0, 0.8],
          duration: 600,
          ease: 'outExpo',
        }, 400);
      }

      // 3. Tagline fades up
      const tagline = rootRef.current!.querySelector('.boot-tagline');
      if (tagline) {
        tl.add(tagline, {
          opacity: [0, 1],
          y: [12, 0],
          duration: 500,
        }, 700);
      }

      // 4. Subtle dot pulse
      const dot = rootRef.current!.querySelector('.boot-dot');
      if (dot) {
        tl.add(dot, {
          opacity: [0, 0.6, 0.3],
          scale: [0.5, 1.2, 1],
          ...spring({ stiffness: 80, damping: 10 }),
        }, 900);
      }

      // 5. Exit fade
      tl.add({}, {
        duration: 400,
        ease: 'inExpo',
        onUpdate: (self: any) => {
          if (rootRef.current) {
            rootRef.current.style.opacity = String(1 - (self.progress ?? 0));
          }
        },
      }, TOTAL_MS - 400);
    });

    return () => {
      scope.revert();
      if (rootRef.current) rootRef.current.style.opacity = '';
    };
  }, []);

  // Skip on any input
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent | MouseEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      skip();
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('click', handler);
      if (rootRef.current) rootRef.current.style.opacity = '';
    };
  }, [show, skip]);

  if (!show) return null;

  const word = 'FAHIM';

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      data-testid="boot-sequence"
      className="fixed inset-0 z-[100] bg-bg-void flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Ambient glow behind wordmark */}
      <div
        aria-hidden="true"
        className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, var(--neon-cyan), transparent 70%)' }}
      />

      {/* Wordmark */}
      <div className="flex gap-[2px] perspective-[600px]">
        {word.split('').map((ch, i) => (
          <span
            key={i}
            className="boot-letter font-display text-5xl md:text-7xl tracking-[0.15em] text-neon-cyan opacity-0"
            style={{ textShadow: '0 0 30px var(--neon-cyan), 0 0 60px rgba(0,240,255,0.2)' }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* Underline */}
      <div
        className="boot-underline mt-3 h-px w-40 opacity-0"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)',
          transformOrigin: 'center',
        }}
      />

      {/* Tagline */}
      <div className="boot-tagline mt-4 font-mono text-[10px] tracking-[4px] text-text-muted opacity-0 uppercase">
        Developer Terminal
      </div>

      {/* Loading dot */}
      <div className="boot-dot mt-8 w-1.5 h-1.5 rounded-full bg-neon-cyan opacity-0" />

      {/* Skip hint — only after skippable */}
      <div className="absolute bottom-8 font-mono text-[9px] text-text-muted/40 tracking-widest">
        CLICK OR PRESS ANY KEY TO SKIP
      </div>
    </div>
  );
}
