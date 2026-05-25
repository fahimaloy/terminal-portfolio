import React, { useState } from 'react';
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

type ContactFormProps = {
  onBackToChat: () => void;
};

type FormState = 'filling' | 'submitting' | 'submitted' | 'error';

export default function ContactForm({ onBackToChat }: ContactFormProps) {
  const [formState, setFormState] = useState<FormState>('filling');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!name.trim()) {
      setErrorMsg('Name is required.');
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
    if (!message.trim()) {
      setErrorMsg('Message is required.');
      return;
    }
    if (message.trim().length < 10) {
      setErrorMsg('Message must be at least 10 characters.');
      return;
    }
    if (message.trim().length > 5000) {
      setErrorMsg('Message too long (max 5000 chars).');
      return;
    }
    if (name.trim().length > 100) {
      setErrorMsg('Name too long (max 100 chars).');
      return;
    }
    if (subject.trim().length > 200) {
      setErrorMsg('Subject too long (max 200 chars).');
      return;
    }

    setFormState('submitting');
    try {
      await axios.post('/api/contact', {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setFormState('submitted');
    } catch (err: any) {
      setFormState('error');
      setErrorMsg(
        err.response?.data?.message || 'Failed to send. Please try again.',
      );
    }
  };

  // Submitted view (readonly)
  if (formState === 'submitted') {
    return (
      <div className="space-y-4 animate-fade-in-scale">
        <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-5 h-5 text-lime-300" />
          </div>
          <div>
            <p className="text-lime-300 font-medium">
              Message Sent Successfully!
            </p>
            <p className="text-gray-400 text-sm">
              I&apos;ll get back to you soon.
            </p>
          </div>
        </div>

        {/* Readonly submitted form */}
        <div className="bg-[#0F172A]/80 border border-gray-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-400">
            <FiUser className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">{name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FiMail className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">{email}</span>
          </div>
          {subject && (
            <div className="flex items-center gap-2 text-gray-400">
              <FiBookmark className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">{subject}</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-gray-400">
            <FiMessageSquare className="w-4 h-4 text-blue-400 mt-0.5" />
            <span className="text-gray-300 whitespace-pre-wrap">{message}</span>
          </div>
        </div>

        <button
          onClick={onBackToChat}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-lg text-sm transition-all"
        >
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

      <div className="relative">
        <FiBookmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          maxLength={200}
          className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500"
          disabled={formState === 'submitting'}
        />
      </div>

      <div className="relative">
        <FiMessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your Message * (min 10 characters)"
          maxLength={5000}
          rows={4}
          className="form-premium-input w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
          disabled={formState === 'submitting'}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={formState === 'submitting'}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {formState === 'submitting' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <FiSend className="w-4 h-4" />
              Send Message
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
