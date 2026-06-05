// src/components/ui/Tilt3D.tsx
import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { motionTokens } from './motionConfig';

type Props = {
  children: React.ReactNode;
  intensity?: number; // degrees, default 2
  className?: string;
};

export default function Tilt3D({
  children,
  intensity = 2,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 20 });
  const sy = useSpring(my, { stiffness: 200, damping: 20 });
  const rx = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const ry = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: 'preserve-3d',
        transformPerspective: 800,
      }}
      transition={{ duration: motionTokens.dur.hover, ease: motionTokens.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
