// src/components/ui/ParticleField.tsx
import React, { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  color: string;
  alpha: number;
};

const COLORS = ['#ffaa00', '#ff00aa', '#00f0ff'];
const COUNT = 40;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce) return; // static

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Seed particles
      particlesRef.current = Array.from({ length: COUNT }, () => ({
        x: rand(0, canvas.width),
        y: rand(0, canvas.height),
        vx: rand(-0.05, 0.05),
        vy: rand(-0.4, -0.15),
        size: rand(1, 3),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: rand(0.2, 0.6),
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = (ts: number) => {
      const dt = lastTsRef.current ? (ts - lastTsRef.current) / 16 : 1;
      lastTsRef.current = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -4) {
          p.y = canvas.height + 4;
          p.x = rand(0, canvas.width);
        }
        if (p.x < -4) p.x = canvas.width;
        if (p.x > canvas.width + 4) p.x = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2]"
    />
  );
}
