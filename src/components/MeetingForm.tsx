// src/components/MeetingForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
  FiMessageSquare,
  FiCheck,
  FiAlertCircle,
  FiArrowLeft,
} from 'react-icons/fi';
import { GlitchText, HudPanel, NeonButton, NeonChip } from './ui';
import { useFormAnimation } from '../hooks/useFormAnimation';
import { getErrorMessage } from '../utils/errorMessage';

type MeetingFormProps = {
  onBackToChat: () => void;
};

type FormState = 'filling' | 'submitting' | 'submitted' | 'error';

const inputClass =
  'w-full bg-bg-smoke border border-white/10 text-text-primary pl-10 pr-4 py-3 font-body text-sm focus:outline-none focus:border-neon-yellow focus:shadow-[0_0_12px_var(--glow-yellow)] placeholder-text-muted transition-all duration-200 clip-notch-md [color-scheme:dark]';
const inputStyle: React.CSSProperties = {};

export default function MeetingForm({ onBackToChat }: MeetingFormProps) {
  const [formState, setFormState] = useState<FormState>('filling');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const { shake } = useFormAnimation();

  useEffect(() => {
    if (errorMsg) shake(errorRef.current);
  }, [errorMsg, shake]);

  // Set min date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Name is required.');
      return;
    }
    if (name.trim().length > 100) {
      setErrorMsg('Name too long.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Invalid email format.');
      return;
    }
    if (!date) {
      setErrorMsg('Date is required.');
      return;
    }
    if (!time) {
      setErrorMsg('Time is required.');
      return;
    }
    if (reason.length > 1000) {
      setErrorMsg('Reason too long (max 1000 chars.).');
      return;
    }

    setFormState('submitting');
    try {
      await axios.post('/api/book-meeting', {
        name: name.trim(),
        email: email.trim(),
        date,
        time,
        reason: reason.trim() || undefined,
      });
      setFormState('submitted');
    } catch (err: unknown) {
      setFormState('error');
      setErrorMsg(getErrorMessage(err, 'Failed to book. Please try again.'));
    }
  };

  if (formState === 'submitted') {
    const formattedDate = date && time ? new Date(date + 'T' + time) : null;
    return (
      <div className="space-y-4" data-testid="meeting-confirmation">
        <HudPanel
          accent="green"
          notch="md"
          className="p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-5 h-5 text-neon-green" />
          </div>
          <div>
            <GlitchText accent="cyan" className="font-display tracking-[2px]">
              MEETING REQUEST SENT
            </GlitchText>
            <div className="font-body text-sm text-text-muted">
              I&apos;ll confirm the time shortly.
            </div>
          </div>
        </HudPanel>

        <HudPanel
          accent="cyan"
          notch="md"
          title="// CONFIRMATION_RECEIVED"
          className="p-4 space-y-3"
        >
          <Row icon={<FiUser />} accent="cyan" text={name} />
          <Row icon={<FiMail />} accent="cyan" text={email} />
          {formattedDate && !isNaN(formattedDate.getTime()) && (
            <Row
              icon={<FiCalendar />}
              accent="cyan"
              text={formattedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
          )}
          {formattedDate && !isNaN(formattedDate.getTime()) && (
            <Row
              icon={<FiClock />}
              accent="cyan"
              text={formattedDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          )}
          {reason && (
            <div className="flex items-start gap-2 text-text-muted">
              <FiMessageSquare className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
              <span className="text-text-primary whitespace-pre-wrap font-body text-sm">
                {reason}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <NeonChip accent="yellow">
              REQUEST_ID: {date.replaceAll('-', '')}-{time.replace(':', '')}
            </NeonChip>
          </div>
        </HudPanel>

        <NeonButton
          accent="cyan"
          variant="ghost"
          iconLeft={<FiArrowLeft />}
          onClick={onBackToChat}
        >
          BACK TO CHAT
        </NeonButton>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      data-testid="meeting-form"
    >
      {errorMsg && (
        <div ref={errorRef}>
          <HudPanel
            accent="red"
            notch="sm"
            className="p-3 flex items-center gap-2"
          >
            <FiAlertCircle className="w-4 h-4 text-neon-red flex-shrink-0" />
            <span className="font-body text-sm text-neon-red">{errorMsg}</span>
          </HudPanel>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-yellow" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name *"
            maxLength={100}
            className={inputClass}
            disabled={formState === 'submitting'}
          />
        </div>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-yellow" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email *"
            className={inputClass}
            disabled={formState === 'submitting'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-yellow" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            className={inputClass}
            disabled={formState === 'submitting'}
          />
        </div>
        <div className="relative">
          <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-yellow" />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
            disabled={formState === 'submitting'}
          />
        </div>
      </div>

      <div className="relative">
        <FiMessageSquare className="absolute left-3 top-3 w-4 h-4 text-neon-yellow" />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for meeting (optional)"
          maxLength={1000}
          rows={3}
          className={`${inputClass} resize-none`}
          disabled={formState === 'submitting'}
        />
      </div>

      <div className="flex gap-2">
        <NeonButton
          type="submit"
          accent="yellow"
          iconLeft={
            formState === 'submitting' ? undefined : (
              <FiCalendar className="w-4 h-4" />
            )
          }
          loading={formState === 'submitting'}
          data-testid="meeting-submit"
        >
          {formState === 'submitting' ? 'BOOKING…' : 'BOOK MEETING'}
        </NeonButton>
        <NeonButton
          type="button"
          variant="ghost"
          accent="cyan"
          onClick={onBackToChat}
          disabled={formState === 'submitting'}
        >
          CANCEL
        </NeonButton>
      </div>
    </form>
  );
}

function Row({
  icon,
  accent,
  text,
}: {
  icon: React.ReactNode;
  accent: 'cyan' | 'yellow';
  text: string;
}) {
  const color = accent === 'cyan' ? 'text-neon-cyan' : 'text-neon-yellow';
  return (
    <div className="flex items-center gap-2 text-text-muted">
      <span className={`${color} w-4 h-4 flex items-center`}>{icon}</span>
      <span className="text-text-primary font-body text-sm">{text}</span>
    </div>
  );
}
