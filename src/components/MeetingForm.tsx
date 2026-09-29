// src/components/MeetingForm.tsx
import React, { useState, useRef, useEffect, useId } from 'react';
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
import type { FormState } from '../types/forms';

type MeetingFormProps = {
  onBackToChat: () => void;
};

/** Per-field validation, so each message is described by the control it
 *  belongs to. The date and time pickers carry no placeholder at all, so a
 *  label is the only thing that can name them. */
type FieldName = 'name' | 'email' | 'date' | 'time' | 'reason';
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ['name', 'email', 'date', 'time', 'reason'];

const inputClass =
  'w-full bg-bg-smoke border border-[var(--overlay-white-10)] text-text-primary pl-10 pr-4 py-3 font-body text-sm focus:outline-none focus:border-neon-amber focus:shadow-[0_0_12px_var(--glow-amber)] focus-visible:ring-2 focus-visible:ring-[var(--neon-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)] placeholder-text-muted transition-all duration-200 clip-notch-md [color-scheme:dark]';
const inputStyle: React.CSSProperties = {};
/** Invalid fields get a coral border via inline style, not a second Tailwind
 *  border utility — two border-colour classes in one string resolve by
 *  generated-CSS order, which is not something to bet an error state on. */
const invalidStyle: React.CSSProperties = { borderColor: 'var(--neon-coral)' };

export default function MeetingForm({ onBackToChat }: MeetingFormProps) {
  // Sanitised useId: valid as an HTML id and as a CSS selector, stable across
  // renders, and distinct per mounted instance so two forms cannot collide.
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    date: `${uid}-date`,
    time: `${uid}-time`,
    reason: `${uid}-reason`,
  };

  const [formState, setFormState] = useState<FormState>('filling');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  /** Server/network failure — not tied to a field, so it stays a banner. */
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingFocus, setPendingFocus] = useState<FieldName | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const { shake } = useFormAnimation();

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pendingFocus === null) return;
    const el = {
      name: nameRef.current,
      email: emailRef.current,
      date: dateRef.current,
      time: timeRef.current,
      reason: reasonRef.current,
    }[pendingFocus];
    el?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  useEffect(() => {
    if (errorMsg) shake(errorRef.current);
  }, [errorMsg, shake]);

  // Set min date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Enter your name.';
    else if (name.trim().length > 100)
      errors.name = 'Name must be 100 characters or fewer.';

    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email =
        'Enter a valid email address, for example you@company.com.';

    if (!date) errors.date = 'Choose a date.';
    if (!time) errors.time = 'Choose a time.';

    if (reason.length > 1000)
      errors.reason = 'Reason must be 1000 characters or fewer.';

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setPendingFocus(FIELD_ORDER.find((f) => errors[f]) ?? null);
      return;
    }
    setFieldErrors({});

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

  const clearError = (field: FieldName) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (formState === 'submitted') {
    const formattedDate = date && time ? new Date(date + 'T' + time) : null;
    return (
      // role="status" — the form is replaced wholesale, so without it the
      // confirmation arrives silently.
      <div
        className="space-y-4"
        data-testid="meeting-confirmation"
        role="status"
      >
        <HudPanel accent="lime" className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-lime/20 flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-5 h-5 text-neon-lime" />
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
            <NeonChip accent="amber">
              REQUEST_ID: {date.replaceAll('-', '')}-{time.replace(':', '')}
            </NeonChip>
          </div>
        </HudPanel>

        <NeonButton
          accent="cyan"
          variant="ghost"
          size="lg"
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
      noValidate
    >
      <p className="font-mono text-[10px] tracking-[0.16em] text-text-muted">
        FIELDS MARKED{' '}
        <span className="text-neon-coral" aria-hidden="true">
          *
        </span>{' '}
        ARE REQUIRED
      </p>

      {errorMsg && (
        <div ref={errorRef} role="alert">
          <HudPanel accent="coral" className="p-3 flex items-center gap-2">
            <FiAlertCircle
              className="w-4 h-4 text-neon-coral flex-shrink-0"
              aria-hidden="true"
            />
            <span className="font-body text-sm text-neon-coral">
              {errorMsg}
            </span>
          </HudPanel>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          id={ids.name}
          label="NAME"
          required
          error={fieldErrors.name}
          control={
            <input
              ref={nameRef}
              id={ids.name}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder="Ada Lovelace"
              maxLength={100}
              autoComplete="name"
              required
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={
                fieldErrors.name ? `${ids.name}-error` : undefined
              }
              style={fieldErrors.name ? invalidStyle : inputStyle}
              className={inputClass}
              disabled={formState === 'submitting'}
            />
          }
          icon={<FiUser className="w-4 h-4" />}
        />
        <Field
          id={ids.email}
          label="EMAIL"
          required
          error={fieldErrors.email}
          control={
            <input
              ref={emailRef}
              id={ids.email}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError('email');
              }}
              placeholder="you@company.com"
              autoComplete="email"
              required
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={
                fieldErrors.email ? `${ids.email}-error` : undefined
              }
              style={fieldErrors.email ? invalidStyle : inputStyle}
              className={inputClass}
              disabled={formState === 'submitting'}
            />
          }
          icon={<FiMail className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          id={ids.date}
          label="DATE"
          required
          error={fieldErrors.date}
          control={
            <input
              ref={dateRef}
              id={ids.date}
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                clearError('date');
              }}
              min={minDate}
              required
              aria-invalid={fieldErrors.date ? true : undefined}
              aria-describedby={
                fieldErrors.date ? `${ids.date}-error` : `${ids.date}-hint`
              }
              style={fieldErrors.date ? invalidStyle : inputStyle}
              className={inputClass}
              disabled={formState === 'submitting'}
            />
          }
          icon={<FiCalendar className="w-4 h-4" />}
          hint="Earliest available is tomorrow."
        />
        <Field
          id={ids.time}
          label="TIME"
          required
          error={fieldErrors.time}
          control={
            <input
              ref={timeRef}
              id={ids.time}
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                clearError('time');
              }}
              required
              aria-invalid={fieldErrors.time ? true : undefined}
              aria-describedby={
                fieldErrors.time ? `${ids.time}-error` : undefined
              }
              style={fieldErrors.time ? invalidStyle : inputStyle}
              className={inputClass}
              disabled={formState === 'submitting'}
            />
          }
          icon={<FiClock className="w-4 h-4" />}
        />
      </div>

      <Field
        id={ids.reason}
        label="REASON"
        error={fieldErrors.reason}
        control={
          <textarea
            ref={reasonRef}
            id={ids.reason}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              clearError('reason');
            }}
            placeholder="What should we cover?"
            maxLength={1000}
            rows={3}
            aria-invalid={fieldErrors.reason ? true : undefined}
            aria-describedby={
              fieldErrors.reason ? `${ids.reason}-error` : undefined
            }
            style={fieldErrors.reason ? invalidStyle : inputStyle}
            className={`${inputClass} resize-none`}
            disabled={formState === 'submitting'}
          />
        }
        icon={<FiMessageSquare className="w-4 h-4" />}
        iconTop
      />

      {/* size="lg" — the default md button measures ~40px tall, under the 44px
          touch minimum. Passing the size here rather than editing NeonButton. */}
      <div className="flex flex-wrap gap-2">
        <NeonButton
          id={`${uid}-submit`}
          type="submit"
          accent="amber"
          size="lg"
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
          size="lg"
          onClick={onBackToChat}
          disabled={formState === 'submitting'}
        >
          CANCEL
        </NeonButton>
      </div>
    </form>
  );
}

/**
 * Label + control + programmatically-associated error, in one slot. Every
 * control gets a real `<label htmlFor>`; the placeholder that used to be the
 * only name is gone, because a placeholder is not a label.
 */
function Field({
  id,
  label,
  icon,
  control,
  required,
  error,
  hint,
  iconTop,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  control: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
  iconTop?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-baseline gap-2 font-mono text-[10px] tracking-[0.2em] text-text-muted"
      >
        <span aria-hidden="true">{'//'}</span>
        <span>{label}</span>
        {required ? (
          <>
            <span className="text-neon-coral" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        ) : (
          // The dash is decorative; "(optional)" is the sr-only half, so the
          // optional state reaches the accessible name instead of living only
          // in the pixels.
          <>
            <span aria-hidden="true" className="text-text-muted">
              —
            </span>
            <span className="sr-only">(optional)</span>
          </>
        )}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className={
            iconTop
              ? 'absolute left-3 top-3 text-neon-amber pointer-events-none'
              : 'absolute left-3 top-1/2 -translate-y-1/2 text-neon-amber pointer-events-none'
          }
        >
          {icon}
        </span>
        {control}
      </div>
      {hint && (
        <p
          id={`${id}-hint`}
          className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-text-muted"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 font-body text-xs text-neon-coral"
        >
          <FiAlertCircle
            className="w-3.5 h-3.5 flex-shrink-0 mt-px"
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function Row({
  icon,
  accent,
  text,
}: {
  icon: React.ReactNode;
  accent: 'cyan' | 'amber';
  text: string;
}) {
  const color = accent === 'cyan' ? 'text-neon-cyan' : 'text-neon-amber';
  return (
    <div className="flex items-center gap-2 text-text-muted">
      <span className={`${color} w-4 h-4 flex items-center`}>{icon}</span>
      <span className="text-text-primary font-body text-sm">{text}</span>
    </div>
  );
}
