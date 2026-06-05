// src/components/ui/BootSequence.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { label: 'BOOT_KERNEL', at: 25 },
  { label: 'MOUNT_FILESYSTEM', at: 55 },
  { label: 'LOAD_NEURAL_LINK', at: 80 },
  { label: 'INITIALIZED', at: 100 },
];

const STORAGE_KEY = 'cyberpunk-boot-shown';
const TOTAL_MS = 1500;
const REDUCED_MS = 200;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function BootSequence() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;
    const reduced = prefersReducedMotion();
    const total = reduced ? REDUCED_MS : TOTAL_MS;
    setShow(true);
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / total) * 100);
      setProgress(p);
    }, 33);
    const finish = setTimeout(() => {
      setShow(false);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore sessionStorage errors
      }
    }, total);
    return () => {
      clearInterval(id);
      clearTimeout(finish);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-bg-void flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="font-display tracking-[6px] text-neon-cyan text-shadow-neon-cyan text-sm">
            {'// NEURAL_LINK'}
          </div>
          <div className="mt-6 w-64 h-1.5 bg-white/5 overflow-hidden">
            <div
              className="h-full bg-neon-yellow transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ul className="mt-4 font-mono text-[10px] text-text-muted space-y-1">
            {STEPS.map((s) => (
              <li
                key={s.label}
                className={
                  progress >= s.at ? 'text-neon-green' : 'text-text-muted'
                }
              >
                {'>'} {s.label}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
