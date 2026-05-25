import React, { useState } from 'react';
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

type MeetingFormProps = {
  onBackToChat: () => void;
};

type FormState = 'filling' | 'submitting' | 'submitted' | 'error';

export default function MeetingForm({ onBackToChat }: MeetingFormProps) {
  const [formState, setFormState] = useState<FormState>('filling');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Set min date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
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
    } catch (err: any) {
      setFormState('error');
      setErrorMsg(
        err.response?.data?.message || 'Failed to book. Please try again.',
      );
    }
  };

  if (formState === 'submitted') {
    const formattedDate = new Date(date + 'T' + time);
    return (
      <div className="space-y-4 animate-fade-in-scale">
        <div className="flex items-center gap-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-5 h-5 text-lime-300" />
          </div>
          <div>
            <p className="text-lime-300 font-medium">Meeting Request Sent!</p>
            <p className="text-gray-400 text-sm">
              I&apos;ll confirm the time shortly.
            </p>
          </div>
        </div>

        <div className="bg-[#0F172A]/80 border border-gray-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-400">
            <FiUser className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">{name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FiMail className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">{email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FiCalendar className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">
              {formattedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FiClock className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">
              {formattedDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {reason && (
            <div className="flex items-start gap-2 text-gray-400">
              <FiMessageSquare className="w-4 h-4 text-purple-400 mt-0.5" />
              <span className="text-gray-300">{reason}</span>
            </div>
          )}
        </div>

        <button
          onClick={onBackToChat}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-lg text-sm transition-all"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in-scale">
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name *"
            maxLength={100}
            className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500"
            disabled={formState === 'submitting'}
          />
        </div>
        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email *"
            className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500"
            disabled={formState === 'submitting'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500 [color-scheme:dark]"
            disabled={formState === 'submitting'}
          />
        </div>
        <div className="relative">
          <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500 [color-scheme:dark]"
            disabled={formState === 'submitting'}
          />
        </div>
      </div>

      <div className="relative">
        <FiMessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for meeting (optional)"
          maxLength={1000}
          rows={3}
          className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
          disabled={formState === 'submitting'}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={formState === 'submitting'}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {formState === 'submitting' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <FiCalendar className="w-4 h-4" />
              Book Meeting
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onBackToChat}
          className="px-4 py-2.5 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl text-sm hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
          disabled={formState === 'submitting'}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
