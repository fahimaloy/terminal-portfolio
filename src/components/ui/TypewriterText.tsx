// src/components/ui/TypewriterText.tsx
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  text: string;
  speed?: number; // ms per char
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
  const doneRef = useRef(false);
  const cancelledRef = useRef(false);
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    cancelledRef.current = false;
    doneRef.current = false;
    setShown('');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      let i = 0;
      interval = setInterval(() => {
        if (cancelledRef.current) {
          if (interval) clearInterval(interval);
          return;
        }
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }
        }
      }, speed);
    };

    if (startDelay > 0) {
      timeout = setTimeout(start, startDelay);
    } else {
      start();
    }
    return () => {
      cancelledRef.current = true;
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [text, speed, startDelay, onDone]);

  useEffect(() => {
    if (!showCursor || doneRef.current) return;
    const id = setInterval(() => setCursorOn((c) => !c), 500);
    return () => clearInterval(id);
  }, [showCursor, doneRef.current]);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {shown}
      {showCursor && !doneRef.current && (
        <span
          className="inline-block w-[6px] h-[1em] bg-current align-middle ml-0.5"
          style={{ opacity: cursorOn ? 1 : 0 }}
        />
      )}
    </span>
  );
}
