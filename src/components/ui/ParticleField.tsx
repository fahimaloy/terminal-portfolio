// src/components/ui/ParticleField.tsx
/* Premium starfield — canvas 50 dots rAF drift @ 55-60fps, muted warm blobs for depth.
   Respects prefers-reduced-motion: static dots only, no drift. */

import React, { useEffect, useRef } from 'react';
import { isReducedMotion } from '../../config/animations';

const BLOBS: { w: number; h: number; left: string; top: string }[] = [
  { w: 520, h: 520, left: '8%', top: '12%' },
  { w: 640, h: 640, left: '52%', top: '8%' },
  { w: 480, h: 480, left: '18%', top: '58%' },
];

const DOT_COUNT = 50;
// Dot colors resolved from tokens.css CSS custom properties at runtime
// (canvas fillStyle requires resolved hex/rgba, not CSS var())
const DOT_COLOR_KEYS = [
  '--neon-yellow',
  '--neon-cyan',
  '--neon-magenta',
  '--neon-green',
  '--fg-1',
] as const;
function resolveDotColors(): string[] {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  return DOT_COLOR_KEYS.map((k) => cs.getPropertyValue(k).trim());
}

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  baseOpacity: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dotsRef = useRef<Dot[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = isReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // init dots
    const resolvedColors = resolveDotColors();
    dotsRef.current = Array.from({ length: DOT_COUNT }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * (reduced ? 0 : 0.18 + (i % 3) * 0.07),
      vy: (Math.random() - 0.5) * (reduced ? 0 : 0.15 + (i % 2) * 0.06),
      r:
        (i % 5 === 0 ? 1.6 : i % 7 === 0 ? 1.2 : 0.7) *
        (0.9 + Math.random() * 0.4),
      c: resolvedColors[i % resolvedColors.length],
      baseOpacity: 0.45 + Math.random() * 0.45,
    }));

    let last = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = Math.min(32, now - last);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const d of dotsRef.current) {
        if (!reduced) {
          d.x += d.vx * (dt / 16);
          d.y += d.vy * (dt / 16);
          // wrap
          if (d.x < -10) d.x = w + 10;
          if (d.x > w + 10) d.x = -10;
          if (d.y < -10) d.y = h + 10;
          if (d.y > h + 10) d.y = -10;
        }
        const twinkle = reduced
          ? 1
          : 0.85 + 0.15 * Math.sin(now * 0.001 + d.x * 0.01);
        ctx.globalAlpha = d.baseOpacity * twinkle * 0.55;
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        // glow
        ctx.globalAlpha = d.baseOpacity * twinkle * 0.09;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2] overflow-hidden"
      >
        {BLOBS.map((b, i) => (
          <div
            key={i}
            className="warm-blob absolute rounded-full"
            style={{
              width: b.w,
              height: b.h,
              left: b.left,
              top: b.top,
              background: `radial-gradient(ellipse at center, var(--bg-3), var(--bg-2) 70%, transparent 75%)`,
              opacity: 0.035,
              filter: 'blur(36px)',
              willChange: 'transform',
            }}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[3]"
        style={{ opacity: 0.9 }}
      />
    </>
  );
}
