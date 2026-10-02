// src/components/ui/Tilt3D.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { animate } from 'animejs';
import { durations, easings, isReducedMotion } from '../../config/animations';

type Props = {
  children: React.ReactNode;
  intensity?: number; // degrees, default 4 (reduced editorial)
  className?: string;
};

export default function Tilt3D({
  children,
  intensity = 4,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const currentAnim = useRef<ReturnType<typeof animate> | null>(null);

  const cancelPrev = useCallback(() => {
    currentAnim.current?.cancel();
    currentAnim.current = null;
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current || isReducedMotion()) return;
      const r = ref.current.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const rotateX = -y * intensity;
      const rotateY = x * intensity;

      cancelPrev();
      currentAnim.current = animate(ref.current, {
        rotateX: `${rotateX}deg`,
        rotateY: `${rotateY}deg`,
        // Was 240ms. There is no --dur-240, so this takes the next token down
        // (durations[200]), the same call ExperienceTimeline/AdminLayout make
        // for their unmatched literals.
        duration: durations[200] * 1000,
        ease: easings.outQuad,
      });
    },
    [intensity, cancelPrev],
  );

  const onLeave = useCallback(() => {
    if (!ref.current || isReducedMotion()) return;
    cancelPrev();
    currentAnim.current = animate(ref.current, {
      rotateX: '0deg',
      rotateY: '0deg',
      duration: durations[500] * 1000,
      ease: easings.outExpo,
    });
  }, [cancelPrev]);

  useEffect(() => {
    return () => cancelPrev();
  }, [cancelPrev]);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '800px',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
