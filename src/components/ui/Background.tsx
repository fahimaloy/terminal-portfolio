/* Premium Vector Background — pure SVG, no WebGL dependency.
Uses layered SVG primitives: AuroraMesh (ambient glow), MorphOrb (organic blobs),
ParticleField (floating particles), ScopeRings (HUD scopes), SignalTicks (data cascade),
GridLattice (HUD grid), ScanlineOverlay (CRT effect). All animated via CSS
keyframes and anime.js for scroll-driven effects. Glass gradient overlay for depth. */

import React, { useEffect, useRef } from 'react';
import { animate, createScope, stagger, onScroll } from 'animejs';
import { isReducedMotion, canAnimate } from '../../config/animations';
import AuroraMesh from './graphics/primitives/AuroraMesh';
import MorphOrb from './graphics/primitives/MorphOrb';
import ScopeRings from './graphics/primitives/ScopeRings';
import SignalTicks from './graphics/primitives/SignalTicks';
import GridLattice from './graphics/primitives/GridLattice';

interface PremiumBackgroundProps {
  className?: string;
  variant?: 'default' | 'hero' | 'blog';
  intensity?: 'low' | 'medium' | 'high';
}

export default function PremiumBackground({
  className = '',
  variant = 'default',
  intensity = 'medium',
}: PremiumBackgroundProps) {
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const isHero = variant === 'hero';
  const isBlog = variant === 'blog';
  const reduced = isReducedMotion();
  const animateEnabled = canAnimate();

  const opacityBase = isBlog ? 0.04 : isHero ? 0.1 : 0.06;
  const intensityMult = intensity === 'high' ? 1.5 : intensity === 'low' ? 0.5 : 1;

  // Initialize anime.js scope for scroll-driven animations
  useEffect(() => {
    if (reduced || !animateEnabled || typeof window === 'undefined') return;

    const scope = createScope({
      root: document.body,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: 800,
        ease: 'outExpo',
      },
    });

    scopeRef.current = scope;

    scope.add(() => {
      // Scroll-driven particle field animation
      const particles = document.querySelectorAll<HTMLElement>('.bg-particle');
      if (particles.length > 0) {
        animate(particles, {
          translateY: ['-50%', '50%'],
          translateX: [-20, 20],
          opacity: [0.3, 0.8, 0.3],
          ease: 'smooth',
          duration: 12000,
          delay: stagger(100, { from: 'first' }),
          loop: true,
          autoplay: onScroll({
            container: window,
            sync: true,
          }),
        });
      }

      // Scroll-driven grid lattice reveal
      const grids = document.querySelectorAll<HTMLElement>('.bg-grid-lattice');
      if (grids.length > 0) {
        animate(grids, {
          opacity: [0.02, 0.06],
          ease: 'outExpo',
          duration: 800,
          autoplay: onScroll({
            container: window,
            sync: false,
            target: grids[0],
          }),
        });
      }

      // Parallax aurora mesh on scroll
      const auroras = document.querySelectorAll<HTMLElement>('.bg-aurora-layer');
      if (auroras.length > 0) {
        animate(auroras, {
          translateY: [0, 100],
          ease: 'outExpo',
          duration: 1000,
          delay: stagger(50, { from: 'first' }),
          autoplay: onScroll({
            container: window,
            sync: true,
          }),
        });
      }

      // MorphOrb organic morphing on scroll
      const orbs = document.querySelectorAll<HTMLElement>('.grat-orb path.grat-fill');
      if (orbs.length > 0) {
        animate(orbs, {
          d: [
            'M 50 8 C 72 10 88 24 88 48 C 88 72 72 90 50 90 C 28 90 12 72 12 48 C 12 24 28 6 50 8 Z',
            'M 50 12 C 68 14 85 28 85 48 C 85 68 68 86 50 86 C 32 86 15 68 15 48 C 15 28 32 10 50 12 Z',
          ],
          ease: 'smooth',
          duration: 4000,
          delay: stagger(800, { from: 'first' }),
          loop: true,
          alternate: true,
          autoplay: onScroll({
            container: window,
            sync: true,
          }),
        });
      }
    });

    return () => {
      scopeRef.current?.revert();
    };
  }, [variant, intensity, reduced, animateEnabled]);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Deep void base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--gradient-bg-void)',
        }}
      />

      {/* Ambient aurora mesh washes with scroll parallax */}
      <AuroraMesh
        variant={isHero ? 'hero' : 'subtle'}
        className="absolute inset-0 opacity-100"
      />

      {/* Particle field - floating SVG particles */}
      <div className="absolute inset-0 bg-particle-field">
        {Array.from({ length: isHero ? 60 : 30 }, (_, i) => (
          <div
            key={i}
            className="bg-particle"
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              borderRadius: '50%',
              background: i % 3 === 0 ? 'var(--particle-cyan)' : i % 3 === 1 ? 'var(--particle-magenta)' : 'var(--particle-violet)',
              opacity: 0.15 + Math.random() * 0.25,
              filter: 'blur(1px)',
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* Organic morph blobs — floating, low opacity with CSS animation */}
      <div
        className="absolute inset-0"
        style={{ opacity: opacityBase * intensityMult }}
      >
        <MorphOrb
          accent="cyan"
          size={isHero ? 320 : 180}
          className="absolute -top-16 -left-20"
          style={{
            animation: 'float-ambient 12s ease-in-out infinite alternate',
          }}
        />
        <MorphOrb
          accent="magenta"
          size={isHero ? 260 : 140}
          className="absolute top-1/3 -right-16"
          style={{
            animation: 'float-ambient 15s ease-in-out infinite alternate-reverse',
          }}
        />
        <MorphOrb
          accent="violet"
          size={isHero ? 220 : 120}
          className="absolute bottom-16 left-10"
          style={{
            animation: 'float-ambient 18s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* HUD grid lattice — subtle, scroll-revealed */}
      <GridLattice
        className="absolute inset-0 bg-grid-lattice pointer-events-none"
        opacity={isHero ? 0.06 : isBlog ? 0.03 : 0.04}
        color="var(--grid-1)"
        aria-hidden="true"
      />

      {/* HUD scope rings — decorative, minimal */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: 0.03 + (intensityMult - 1) * 0.02 }}
      >
        <ScopeRings accent="cyan" size={isHero ? 280 : 160} />
      </div>

      {/* Signal tick cascade — subtle vertical data stream */}
      <SignalTicks
        accent="cyan"
        count={isHero ? 24 : 12}
        className="absolute left-6 md:left-12 top-0 bottom-0"
      />
      <SignalTicks
        accent="magenta"
        count={isHero ? 20 : 10}
        className="absolute right-6 md:right-12 top-0 bottom-0"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Scanline overlay for subtle CRT aesthetic */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          // token-lint-ignore -- scanline gradient uses raw rgba for subtle CRT effect
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)',
          opacity: isHero ? 0.15 : 0.08,
          animation: 'scanline-drift 8s linear infinite',
        }}
      />

      {/* Glass gradient overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--gradient-overlay-hero)',
          backdropFilter: 'blur(0px)',
        }}
      />

      {/* CSS animations for background elements */}
      <style jsx>{`
        @keyframes float-ambient {
          0% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-20px) rotate(1deg) scale(1.02); }
          50% { transform: translateY(-10px) rotate(-0.5deg) scale(0.98); }
          75% { transform: translateY(-25px) rotate(0.5deg) scale(1.01); }
          100% { transform: translateY(-15px) rotate(0.5deg) scale(1); }
        }
        @keyframes scanline-drift {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
      `}</style>
    </div>
  );
}
