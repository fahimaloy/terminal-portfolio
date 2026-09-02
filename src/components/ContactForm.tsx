// src/components/ContactForm.tsx
import React, { useState, useRef, useEffect } from 'react';
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

type Props = { onBackToChat: () => void };
type FormState = 'filling' | 'submitting' | 'submitted' | 'error';

export default function ContactForm({ onBackToChat }: Props) {
  const [formState, setFormState] = useState<FormState>('filling');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const { shake, focusIn, focusOut } = useFormAnimation();

  useEffect(() => {
    if (errorMsg) shake(errorRef.current);
  }, [errorMsg, shake]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) return setErrorMsg('Name is required.');
    if (!email.trim()) return setErrorMsg('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setErrorMsg('Invalid email format.');
    if (!message.trim()) return setErrorMsg('Message is required.');
    if (message.trim().length < 10)
      return setErrorMsg('Message must be at least 10 characters.');
    if (message.trim().length > 5000)
      return setErrorMsg('Message too long (max 5000 chars).');
    if (name.trim().length > 100)
      return setErrorMsg('Name too long (max 100 chars).');
    if (subject.trim().length > 200)
      return setErrorMsg('Subject too long (max 200 chars).');
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
      <div className="space-y-4">
        <HudPanel
          accent="green"
          notch="md"
          className="p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-5 h-5 text-neon-green" />
          </div>
          <div>
            <div className="font-display tracking-[2px] text-neon-green text-shadow-neon-green">
              MESSAGE SENT
            </div>
            <div className="font-body text-sm text-text-muted">
              I&apos;ll get back to you soon.
            </div>
          </div>
        </HudPanel>

        <HudPanel accent="cyan" notch="md" className="p-4 space-y-2">
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

        <NeonButton accent="cyan" onClick={onBackToChat}>
          BACK TO CHAT
        </NeonButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
        <FieldInput
          icon={<FiUser />}
          placeholder="Your Name *"
          maxLength={100}
          value={name}
          onChange={setName}
          disabled={formState === 'submitting'}
        />
        <FieldInput
          icon={<FiMail />}
          type="email"
          placeholder="Your Email *"
          value={email}
          onChange={setEmail}
          disabled={formState === 'submitting'}
        />
      </div>

      <FieldInput
        icon={<FiBookmark />}
        placeholder="Subject (optional)"
        maxLength={200}
        value={subject}
        onChange={setSubject}
        disabled={formState === 'submitting'}
      />

      <FieldTextarea
        icon={<FiMessageSquare />}
        placeholder="Your Message * (min 10 characters)"
        maxLength={5000}
        rows={4}
        value={message}
        onChange={setMessage}
        disabled={formState === 'submitting'}
      />

      <div className="flex gap-2">
        <NeonButton
          type="submit"
          accent="yellow"
          iconLeft={formState === 'submitting' ? undefined : <FiSend />}
          loading={formState === 'submitting'}
        >
          {formState === 'submitting' ? 'SENDING…' : 'SEND MESSAGE'}
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

function FieldInput({
  icon,
  type = 'text',
  placeholder,
  maxLength,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  maxLength?: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { focusIn, focusOut } = useFormAnimation();
  return (
    <div className="relative" ref={wrapRef}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-yellow">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => focusIn(wrapRef.current)}
        onBlur={() => focusOut(wrapRef.current)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full bg-bg-smoke border border-white/10 text-text-primary pl-10 pr-4 py-3 font-body text-sm focus:outline-none focus:border-neon-yellow focus:shadow-[0_0_12px_var(--glow-yellow)] placeholder-text-muted transition-all duration-200 clip-notch-md"
      />
    </div>
  );
}

function FieldTextarea({
  icon,
  placeholder,
  maxLength,
  rows = 3,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  placeholder: string;
  maxLength?: number;
  rows?: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { focusIn, focusOut } = useFormAnimation();
  return (
    <div className="relative" ref={wrapRef}>
      <span className="absolute left-3 top-3 text-neon-yellow">{icon}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => focusIn(wrapRef.current)}
        onBlur={() => focusOut(wrapRef.current)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        className="w-full bg-bg-smoke border border-white/10 text-text-primary pl-10 pr-4 py-3 font-body text-sm focus:outline-none focus:border-neon-yellow focus:shadow-[0_0_12px_var(--glow-yellow)] placeholder-text-muted resize-none transition-all duration-200 clip-notch-md"
      />
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
