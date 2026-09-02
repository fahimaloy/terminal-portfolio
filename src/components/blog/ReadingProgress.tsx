// src/components/blog/ReadingProgress.tsx
/* Fixed top progress bar tracking read position within an article element. */

import React, { useEffect, useState } from 'react';

interface Props {
  /** Element whose scroll-through drives the bar. */
  targetRef: React.RefObject<HTMLElement>;
}

export default function ReadingProgress({ targetRef }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      const el = targetRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(scrolled / total);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        compute();
        raf = 0;
      });
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetRef]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] h-[3px] bg-white/[0.04]"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full"
        style={{
          width: `${progress * 100}%`,
          background:
            'linear-gradient(90deg, var(--neon-cyan), var(--neon-yellow), var(--neon-magenta))',
          boxShadow: '0 0 10px var(--neon-cyan)',
          transition: 'width 80ms linear',
        }}
      />
    </div>
  );
}
