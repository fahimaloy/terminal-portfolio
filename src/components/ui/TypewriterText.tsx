// src/components/ui/TypewriterText.tsx
import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { isReducedMotion } from '../../config/animations';

type Props = {
  text: string;
  speed?: number; // ms per char (used to derive total duration)
  startDelay?: number;
  showCursor?: boolean;
  onDone?: () => void;
  className?: string;
};

export default function TypewriterText({
  text,
  speed = 12,
  startDelay = 0,
  showCursor = true,
  onDone,
  className = '',
}: Props) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  const [cursorOn, setCursorOn] = useState(true);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    // SSR / reduced motion: show full text immediately
    if (isReducedMotion()) {
      setShown(text);
      setDone(true);
      onDoneRef.current?.();
      return;
    }

    setDone(false);
    setShown('');

    const proxy = { val: 0 };
    const totalDuration = text.length * speed;

    const startAnim = () => {
      animRef.current = animate(proxy, {
        val: [0, text.length],
        duration: totalDuration,
        ease: 'linear',
        onUpdate: () => {
          setShown(text.slice(0, Math.floor(proxy.val)));
        },
        onComplete: () => {
          setShown(text);
          setDone(true);
          onDoneRef.current?.();
        },
      });
    };

    if (startDelay > 0) {
      timerRef.current = setTimeout(startAnim, startDelay);
    } else {
      startAnim();
    }

    return () => {
      animRef.current?.cancel();
      animRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed, startDelay]);

  useEffect(() => {
    if (!showCursor || done) return;
    const id = setInterval(() => setCursorOn((c) => !c), 500);
    return () => clearInterval(id);
  }, [showCursor, done]);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {shown}
      {showCursor && !done && (
        <span
          className="inline-block w-[6px] h-[1em] bg-current align-middle ml-0.5"
          style={{ opacity: cursorOn ? 1 : 0 }}
        />
      )}
    </span>
  );
}
