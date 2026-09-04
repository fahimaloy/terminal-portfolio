// src/components/ui/ParticleField.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   PARTICLE FIELD — Cursor-reactive floating particles
   Uses anime.js createAnimatable for smooth cursor-follow physics.
   Particles drift upward, react to cursor proximity.
   ═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useCallback } from 'react';
import { damp, mapRange } from 'animejs';
import { createSafeAnimatable } from '../../utils/animatable';
import { isReducedMotion } from '../../config/animations';

type Particle = {
  el: HTMLDivElement;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  speed: number;
  animatable: ReturnType<typeof createSafeAnimatable>;
};

const COLORS = ['#ffaa00', '#ff00aa', '#00f0ff', '#39ff14', '#8a2be2'];
const COUNT = 30;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const dimsRef = useRef({ w: 0, h: 0 });

  const createParticles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing
    particlesRef.current.forEach((p) => p.el.remove());
    particlesRef.current = [];

    dimsRef.current = {
      w: window.innerWidth,
      h: window.innerHeight,
    };

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('div');
      const size = rand(1.5, 4);
      const baseX = rand(0, dimsRef.current.w);
      const baseY = rand(0, dimsRef.current.h);

      el.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
        border-radius: 50%;
        pointer-events: none;
        opacity: 0;
        left: 0;
        top: 0;
        will-change: transform, opacity;
      `;
      container.appendChild(el);

      particlesRef.current.push({
        el,
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        vx: rand(-0.3, 0.3),
        vy: rand(-0.6, -0.2),
        size,
        speed: rand(0.3, 1),
        animatable: createSafeAnimatable(el, {
          x: 0,
          y: 0,
          duration: 600,
          ease: 'outExpo',
        }),
      });
    }
  }, []);

  useEffect(() => {
    if (isReducedMotion()) return;

    createParticles();

    const handleResize = () => {
      dimsRef.current = {
        w: window.innerWidth,
        h: window.innerHeight,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        cursorRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const tick = () => {
      const { w, h } = dimsRef.current;
      const cursor = cursorRef.current;
      const time = Date.now() * 0.001;

      for (const p of particlesRef.current) {
        // Floating drift
        p.vx += Math.sin(time * p.speed) * 0.005;
        p.vy -= 0.002;

        // Cursor repulsion
        const dx = p.x - cursor.x;
        const dy = p.y - cursor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120;

        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 2.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx = damp(p.vx, 0, 0.92, 0.08);
        p.vy = damp(p.vy, 0, 0.92, 0.08);

        // Wrap around screen
        if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); }
        if (p.y > h + 10) { p.y = -10; p.x = rand(0, w); }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Opacity based on proximity to cursor
        const proximityOpacity = dist < maxDist
          ? mapRange(dist, 0, maxDist, 0.9, 0.3)
          : 0.4;

        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        p.el.style.opacity = String(proximityOpacity);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // Handle visibility
    const onVis = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      particlesRef.current.forEach((p) => {
        p.animatable.revert();
        p.el.remove();
      });
      particlesRef.current = [];
    };
  }, [createParticles]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2]"
    />
  );
}
