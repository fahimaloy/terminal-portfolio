// src/pages/404.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   404 PAGE — Enhanced with anime.js animations
   - Glitch 404 text
   - Scrambled message reveal
   - Floating particles
   - Spring CTA button entrance
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GlitchText, HudPanel, NeonButton, StatBar } from '../components/ui';
import { animate, createScope, stagger } from 'animejs';
import { isReducedMotion } from '../config/animations';

export default function NotFoundPage() {
  const router = useRouter();
  const [glitchText, setGlitchText] = useState('404');
  const [scrambledMsg, setScrambledMsg] = useState('');
  const [particles, setParticles] = useState<
    { x: number; y: number; dur: number; delay: number; color: string }[]
  >([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const targetMsg =
    "THE PAGE YOU'RE LOOKING FOR ISN'T IN THE LOCAL NETWORK. THE ROUTE MAY HAVE BEEN DECOMMISSIONED OR NEVER EXISTED.";
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

  // Generate particle positions after mount to avoid hydration mismatch
  useEffect(() => {
    const colors = [
      'var(--neon-yellow)',
      'var(--neon-magenta)',
      'var(--neon-cyan)',
      'var(--neon-green)',
    ];
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        color: colors[i % 4],
      })),
    );
  }, []);

  useEffect(() => {
    if (!pageRef.current || isReducedMotion()) {
      setScrambledMsg(targetMsg);
      return;
    }

    const scope = createScope({ root: pageRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      // Stagger entrance for diagnostic items
      const diagItems = pageRef.current!.querySelectorAll('.diag-item');
      animate(diagItems, {
        opacity: [0, 1],
        x: [-10, 0],
        duration: 400,
        ease: 'outExpo',
        delay: stagger(100),
      });

      // Stagger entrance for buttons
      const btns = pageRef.current!.querySelectorAll('.notfound-btn');
      animate(btns, {
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.9, 1],
        duration: 400,
        ease: 'outExpo',
        delay: stagger(80),
      });
    });

    return () => scope.revert();
  }, []);

  // Scramble effect
  useEffect(() => {
    if (isReducedMotion()) {
      setScrambledMsg(targetMsg);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      let result = '';
      for (let i = 0; i < targetMsg.length; i++) {
        if (i < index || targetMsg[i] === ' ') {
          result += targetMsg[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setScrambledMsg(result);
      index++;
      if (index > targetMsg.length) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, []);

  // Glitch effect on 404
  useEffect(() => {
    if (isReducedMotion()) return;

    const interval = setInterval(() => {
      const glitchChars = '!@#$%^&*()_+{}[]|;:,.<>?/~';
      const original = '404';
      let glitched = '';
      for (let i = 0; i < original.length; i++) {
        if (Math.random() < 0.3) {
          glitched +=
            glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else {
          glitched += original[i];
        }
      }
      setGlitchText(glitched);
      setTimeout(() => setGlitchText('404'), 100);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>404 // SIGNAL_LOST | Fahimaloy Portfolio</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div
        ref={pageRef}
        className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      >
        {/* Floating particles */}
        <div
          ref={particlesRef}
          className="absolute inset-0 pointer-events-none"
        >
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-40"
              style={{
                background: p.color,
                left: `${p.x}%`,
                top: `${p.y}%`,
                animation: `float ${p.dur}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="w-full max-w-2xl space-y-6 relative z-10">
          <div className="text-center">
            <div className="text-[10px] font-display tracking-[6px] text-neon-red text-shadow-neon-magenta mb-3 diag-item opacity-0">
              {'// ERROR // 404'}
            </div>
            <GlitchText
              as="h1"
              accent="magenta"
              shift
              className="text-7xl md:text-9xl"
            >
              {glitchText}
            </GlitchText>
            <div className="font-display tracking-[4px] text-neon-yellow text-shadow-neon-yellow mt-4 diag-item opacity-0">
              SIGNAL_LOST
            </div>
            <div className="font-body text-sm text-text-secondary mt-3 max-w-md mx-auto diag-item opacity-0 min-h-[3rem]">
              {scrambledMsg}
            </div>
          </div>

          <HudPanel
            accent="red"
            notch="md"
            title="// DIAGNOSTIC_LOG"
            className="p-4 space-y-3"
          >
            <div className="diag-item opacity-0">
              <StatBar label="UPLINK" value={0} accent="red" />
            </div>
            <div className="diag-item opacity-0">
              <StatBar label="ROUTE_INTEGRITY" value={12} accent="magenta" />
            </div>
            <div className="diag-item opacity-0">
              <StatBar label="SIGNAL_STRENGTH" value={5} accent="yellow" />
            </div>
            <div className="text-[10px] font-mono text-text-muted space-y-1">
              <div className="diag-item opacity-0">{'>'} STATUS: NOT_FOUND</div>
              <div className="diag-item opacity-0">
                {'>'} PATH: {router.asPath || '/'}
              </div>
              <div className="diag-item opacity-0">
                {'>'} SUGGESTION: RETURN TO ROOT
              </div>
            </div>
          </HudPanel>

          <div className="flex justify-center gap-3">
            <NeonButton
              accent="yellow"
              onClick={() => router.push('/')}
              className="notfound-btn opacity-0"
            >
              RETURN TO ROOT
            </NeonButton>
            <NeonButton
              accent="cyan"
              variant="outline"
              onClick={() => router.back()}
              className="notfound-btn opacity-0"
            >
              GO BACK
            </NeonButton>
          </div>
        </div>
      </div>
    </>
  );
}
