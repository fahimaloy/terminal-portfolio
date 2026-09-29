// src/components/ContactForm.tsx
import React, { useState, useRef, useEffect, useId } from 'react';
import axios from 'axios';
import {
  FiSend,
  FiCheck,
  FiAlertCircle,
  FiUser,
  FiMail,
  FiMessageSquare,
  FiBookmark,
} from 'react-icons/fi';
import { HudPanel, NeonButton } from './ui';
import { useFormAnimation } from '../hooks/useFormAnimation';
import { getErrorMessage } from '../utils/errorMessage';
import type { FormState } from '../types/forms';

type Props = { onBackToChat: () => void };

/**
 * Validation failures are per-field, not one banner string: WCAG 3.3.1 wants
 * the offending control identified and described. The form used to push every
 * failure — including "Message is required" — into a single top-of-form string
 * that no control pointed at, so a screen reader heard an error with no idea
 * which of the four fields it belonged to.
 */
type FieldName = 'name' | 'email' | 'subject' | 'message';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Focus moves to the first invalid control in reading order, not to a string. */
const FIELD_ORDER: FieldName[] = ['name', 'email', 'subject', 'message'];

export default function ContactForm({ onBackToChat }: Props) {
  // Sanitised so the id is a valid HTML id AND a valid CSS selector — React 19
  // returns guillemet-delimited ids, which need escaping in querySelector.
  // Two forms can mount on one page (the overlay renders one mode at a time,
  // but nothing stops a second), and useId is per-instance, so they cannot
  // collide.
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    subject: `${uid}-subject`,
    message: `${uid}-message`,
  };

  const [formState, setFormState] = useState<FormState>('filling');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  /** Server/network failure — not tied to a field, so it stays a banner. */
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingFocus, setPendingFocus] = useState<FieldName | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const { shake, focusIn, focusOut } = useFormAnimation();

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Focus the first invalid control once its error text is in the DOM, so the
  // announced name and its description arrive together.
  useEffect(() => {
    if (pendingFocus === null) return;
    const el = {
      name: nameRef.current,
      email: emailRef.current,
      subject: subjectRef.current,
      message: messageRef.current,
    }[pendingFocus];
    el?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  useEffect(() => {
    if (errorMsg) shake(errorRef.current);
  }, [errorMsg, shake]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Enter your name.';
    else if (name.trim().length > 100)
      errors.name = 'Name must be 100 characters or fewer.';

    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email =
        'Enter a valid email address, for example you@company.com.';

    if (subject.trim().length > 200)
      errors.subject = 'Subject must be 200 characters or fewer.';

    if (!message.trim()) errors.message = 'Enter a message.';
    else if (message.trim().length < 10)
      errors.message = `Message must be at least 10 characters — ${message.trim().length} so far.`;
    else if (message.trim().length > 5000)
      errors.message = 'Message must be 5000 characters or fewer.';

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
      await axios.post('/api/contact', {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setFormState('submitted');
    } catch (err: unknown) {
      setFormState('error');
      setErrorMsg(getErrorMessage(err, 'Failed to send. Please try again.'));
    }
  };

  if (formState === 'submitted') {
    return (
      // role="status": the form vanishes and is replaced by the confirmation.
      // Without it the transition is silent for a screen-reader user.
      <div className="space-y-4" role="status">
        <HudPanel accent="lime" className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-lime/20 flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-5 h-5 text-neon-lime" />
          </div>
          <div>
            <div className="font-display tracking-[2px] text-neon-lime text-shadow-neon-lime">
              MESSAGE SENT
            </div>
            <div className="font-body text-sm text-text-muted">
              I&apos;ll get back to you soon.
            </div>
          </div>
        </HudPanel>

        <HudPanel accent="cyan" className="p-4 space-y-2">
          <SummaryRow icon={<FiUser />} label="Name" value={name} />
          <SummaryRow icon={<FiMail />} label="Email" value={email} />
          {subject && (
            <SummaryRow icon={<FiBookmark />} label="Subject" value={subject} />
          )}
          <div className="flex items-start gap-2 text-text-muted">
            <FiMessageSquare className="w-4 h-4 text-neon-cyan mt-0.5 flex-shrink-0" />
            <span className="text-text-primary whitespace-pre-wrap font-body text-sm">
              {message}
            </span>
          </div>
        </HudPanel>

        <NeonButton accent="cyan" size="lg" onClick={onBackToChat}>
          BACK TO CHAT
        </NeonButton>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      noValidate
      data-testid="contact-form"
    >
      {/* 3.3.2 Labels or Instructions — the required-marker key, read once at
          the top instead of being decoded field by field. */}
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
        <FieldInput
          id={ids.name}
          inputRef={nameRef}
          label="NAME"
          required
          icon={<FiUser />}
          autoComplete="name"
          placeholder="Ada Lovelace"
          maxLength={100}
          value={name}
          error={fieldErrors.name}
          onChange={(v) => {
            setName(v);
            if (fieldErrors.name)
              setFieldErrors((p) => ({ ...p, name: undefined }));
          }}
          disabled={formState === 'submitting'}
        />
        <FieldInput
          id={ids.email}
          inputRef={emailRef}
          label="EMAIL"
          required
          icon={<FiMail />}
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          error={fieldErrors.email}
          onChange={(v) => {
            setEmail(v);
            if (fieldErrors.email)
              setFieldErrors((p) => ({ ...p, email: undefined }));
          }}
          disabled={formState === 'submitting'}
        />
      </div>

      <FieldInput
        id={ids.subject}
        inputRef={subjectRef}
        label="SUBJECT"
        icon={<FiBookmark />}
        placeholder="Project collaboration"
        maxLength={200}
        value={subject}
        error={fieldErrors.subject}
        onChange={(v) => {
          setSubject(v);
          if (fieldErrors.subject)
            setFieldErrors((p) => ({ ...p, subject: undefined }));
        }}
        disabled={formState === 'submitting'}
      />

      <FieldTextarea
        id={ids.message}
        inputRef={messageRef}
        label="MESSAGE"
        required
        icon={<FiMessageSquare />}
        placeholder="Tell me about the project, the timeline, and what you need…"
        hint="Minimum 10 characters."
        maxLength={5000}
        rows={4}
        value={message}
        error={fieldErrors.message}
        onChange={(v) => {
          setMessage(v);
          if (fieldErrors.message)
            setFieldErrors((p) => ({ ...p, message: undefined }));
        }}
        disabled={formState === 'submitting'}
      />

      {/* size="lg" — the default md button is ~40px tall, under the 44px
          minimum target. Not a NeonButton edit, just the size the form needs. */}
      <div className="flex flex-wrap gap-2">
        <NeonButton
          id={`${uid}-submit`}
          type="submit"
          accent="amber"
          size="lg"
          iconLeft={formState === 'submitting' ? undefined : <FiSend />}
          loading={formState === 'submitting'}
        >
          {formState === 'submitting' ? 'SENDING…' : 'SEND MESSAGE'}
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
 * A real `<label htmlFor>`, not a placeholder. Placeholder text disappears on
 * first keystroke, is invisible to several screen readers as a name source and
 * is not a label in any case — the four fields here carried their only
 * "label" that way, which is a straight 3.3.2 / 4.1.2 failure.
 */
function FieldLabel({
  htmlFor,
  text,
  required,
}: {
  htmlFor: string;
  text: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-baseline gap-2 font-mono text-[10px] tracking-[0.2em] text-text-muted"
    >
      <span aria-hidden="true">{'//'}</span>
      <span>{text}</span>
      {required ? (
        <>
          <span className="text-neon-coral" aria-hidden="true">
            *
          </span>
          <span className="sr-only">(required)</span>
        </>
      ) : (
        // The dash is decorative; "(optional)" is the sr-only half, so the
        // optional state reaches the accessible name instead of living only in
        // the pixels. Optional is the HTML default, so this is belt-and-braces,
        // but it keeps the two branches symmetrical and legible to both.
        <>
          <span aria-hidden="true" className="text-text-muted">
            —
          </span>
          <span className="sr-only">(optional)</span>
        </>
      )}
    </label>
  );
}

/**
 * role="alert" announces the text the moment it is inserted, which is the
 * whole point: a validation message nobody hears is not feedback. Paired with
 * aria-invalid + aria-describedby on the control, so the message is also
 * available on demand when focus lands on the field.
 */
function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 font-body text-xs text-neon-coral"
    >
      <FiAlertCircle
        className="w-3.5 h-3.5 flex-shrink-0 mt-px"
        aria-hidden="true"
      />
      <span>{children}</span>
    </p>
  );
}

const FIELD_INPUT_CLASS =
  'w-full bg-bg-smoke border border-[var(--overlay-white-10)] text-text-primary pl-10 pr-4 py-3 font-body text-sm focus:outline-none focus:border-neon-amber focus:shadow-[0_0_12px_var(--glow-amber)] focus-visible:ring-2 focus-visible:ring-[var(--neon-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)] placeholder-text-muted transition-all duration-200 clip-notch-md';

function FieldInput({
  id,
  inputRef,
  label,
  required,
  icon,
  type = 'text',
  autoComplete,
  placeholder,
  maxLength,
  value,
  error,
  onChange,
  disabled,
}: {
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  type?: string;
  autoComplete?: string;
  placeholder: string;
  maxLength?: number;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { focusIn, focusOut } = useFormAnimation();
  const errorId = `${id}-error`;
  return (
    <div>
      <FieldLabel htmlFor={id} text={label} required={required} />
      <div className="relative" ref={wrapRef}>
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-amber pointer-events-none"
        >
          {icon}
        </span>
        <input
          ref={inputRef}
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => focusIn(wrapRef.current)}
          onBlur={() => focusOut(wrapRef.current)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          style={error ? { borderColor: 'var(--neon-coral)' } : undefined}
          className={FIELD_INPUT_CLASS}
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function FieldTextarea({
  id,
  inputRef,
  label,
  required,
  icon,
  placeholder,
  hint,
  maxLength,
  rows = 3,
  value,
  error,
  onChange,
  disabled,
}: {
  id: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  placeholder: string;
  hint?: string;
  maxLength?: number;
  rows?: number;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { focusIn, focusOut } = useFormAnimation();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');
  return (
    <div>
      <FieldLabel htmlFor={id} text={label} required={required} />
      <div className="relative" ref={wrapRef}>
        <span
          aria-hidden="true"
          className="absolute left-3 top-3 text-neon-amber pointer-events-none"
        >
          {icon}
        </span>
        <textarea
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => focusIn(wrapRef.current)}
          onBlur={() => focusOut(wrapRef.current)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          style={error ? { borderColor: 'var(--neon-coral)' } : undefined}
          className={`${FIELD_INPUT_CLASS} resize-none`}
        />
      </div>
      {hint && (
        <p
          id={hintId}
          className="mt-1.5 font-mono text-[10px] tracking-[0.14em] text-text-muted"
        >
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-text-muted">
      <span className="text-neon-cyan">{icon}</span>
      <span className="text-text-muted font-body text-xs uppercase tracking-wider">
        {label}:
      </span>
      <span className="text-text-primary font-body text-sm">{value}</span>
    </div>
  );
}
