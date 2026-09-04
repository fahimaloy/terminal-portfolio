// src/components/MeetingBooking.tsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiX } from 'react-icons/fi';
import { animate } from 'animejs';
import { GlitchText, HudPanel, NeonButton } from './ui';
import { getErrorMessage } from '../utils/errorMessage';
import { isReducedMotion } from '../config/animations';

export const MeetingBooking: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!panelRef.current || isReducedMotion()) return;
    animate(panelRef.current, {
      opacity: [0, 1],
      scale: [0.95, 1],
      duration: 300,
      ease: 'outExpo',
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !date || !time) {
      setStatus('error');
      setMessage('Please fill in all required fields.');
      return;
    }

    setStatus('loading');
    try {
      const res = await axios.post('/api/book-meeting', {
        name,
        email,
        date,
        time,
        reason,
      });

      if (res.data?.ok) {
        setStatus('success');
        setMessage('Your meeting requested has been placed!');
        autoCloseRef.current = setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error('Something went wrong');
      }
    } catch (err: unknown) {
      setStatus('error');
      setMessage(getErrorMessage(err, 'Failed to book meeting'));
    }
  };

  const inputClass =
    'w-full bg-bg-smoke border border-white/10 text-text-primary px-4 py-2.5 font-body text-sm focus:outline-none focus:border-neon-magenta placeholder-text-muted transition-colors [color-scheme:dark]';
  const inputStyle: React.CSSProperties = {
    clipPath:
      'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div ref={panelRef} className="w-full max-w-md relative opacity-0">
        <div
          aria-hidden="true"
          className="absolute -top-px left-0 right-0 h-[2px] bg-neon-magenta shadow-[0_0_12px_var(--glow-magenta)]"
        />
        <HudPanel accent="magenta" notch="md" title="// BOOK_MEETING" className="p-6">
          <div className="text-[9px] font-display tracking-[3px] text-text-muted mb-4">
            {'> USER: anonymous_visitor'}
          </div>

          <div className="flex justify-between items-center mb-4">
            <GlitchText accent="magenta" as="h3" className="text-lg">
              BOOK A MEETING
            </GlitchText>
            <NeonButton variant="ghost" accent="magenta" onClick={onClose} iconLeft={<FiX />}>
              CLOSE
            </NeonButton>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                NAME <span className="text-neon-red">*</span>
              </label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} style={inputStyle} />
            </div>

            <div>
              <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                EMAIL <span className="text-neon-red">*</span>
              </label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  DATE <span className="text-neon-red">*</span>
                </label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                  TIME <span className="text-neon-red">*</span>
                </label>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                REASON FOR MEETING
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe what you'd like to discuss..."
                className={`${inputClass} resize-none h-24`}
                style={inputStyle}
              />
            </div>

            {status === 'error' && (
              <HudPanel accent="red" notch="sm" className="p-2 text-center">
                <span className="font-body text-sm text-neon-red">{message}</span>
              </HudPanel>
            )}
            {status === 'success' && (
              <HudPanel accent="green" notch="sm" className="p-2 text-center">
                <span className="font-body text-sm text-neon-green">{message}</span>
              </HudPanel>
            )}

            <NeonButton
              type="submit"
              accent="magenta"
              className="w-full"
              disabled={status === 'loading' || status === 'success'}
              loading={status === 'loading'}
            >
              {status === 'loading' ? 'BOOKING…' : status === 'success' ? 'BOOKED!' : 'SUBMIT REQUEST'}
            </NeonButton>
          </form>
        </HudPanel>
      </div>
    </div>
  );
};
