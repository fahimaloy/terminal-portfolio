import React, { useEffect, useRef, useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';
import AdvancedFeaturesBar, { FeatureMode } from './AdvancedFeaturesBar';
import ContactForm from './ContactForm';
import MeetingForm from './MeetingForm';
import ProjectMatchForm from './ProjectMatchForm';
import { PortfolioProject } from '../utils/api';

const premiumCardColors = [
  { bg: 'bg-purple-500/15', border: 'border-purple-400/25', hoverBorder: 'hover:border-purple-400/50', glow: 'hover:shadow-purple-500/20' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-400/25', hoverBorder: 'hover:border-cyan-400/50', glow: 'hover:shadow-cyan-500/20' },
  { bg: 'bg-pink-500/15', border: 'border-pink-400/25', hoverBorder: 'hover:border-pink-400/50', glow: 'hover:shadow-pink-500/20' },
  { bg: 'bg-emerald-500/15', border: 'border-emerald-400/25', hoverBorder: 'hover:border-emerald-400/50', glow: 'hover:shadow-emerald-500/20' },
  { bg: 'bg-orange-500/15', border: 'border-orange-400/25', hoverBorder: 'hover:border-orange-400/50', glow: 'hover:shadow-orange-500/20' },
  { bg: 'bg-yellow-500/15', border: 'border-yellow-400/25', hoverBorder: 'hover:border-yellow-400/50', glow: 'hover:shadow-yellow-500/20' },
];

const getColor = (idx: number) => premiumCardColors[idx % premiumCardColors.length];

type MessageOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Current chat input value and setter (for parent sync) */
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  /** Suggestions to show (optional) */
  suggestions?: { label: string; icon: React.ReactNode }[];
  onSuggestionClick?: (label: string) => void;
  /** Projects data for ProjectMatchForm */
  projects: PortfolioProject[];
};

export default function MessageOverlay({
  isOpen,
  onClose,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  suggestions,
  onSuggestionClick,
  projects,
}: MessageOverlayProps) {
  const [mode, setMode] = useState<FeatureMode>('chat');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && mode === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'chat') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, mode]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSend(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModeChange = (newMode: FeatureMode) => {
    setMode(newMode);
  };

  const handleBackToChat = () => {
    setMode('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isFormMode = mode !== 'chat';

  return (
    <>
      {/* Overlay backdrop */}
      <div className="overlay-blur-bg" onClick={onClose} />

      {/* Overlay content */}
      <div
        ref={overlayRef}
        className="overlay-content fixed left-0 right-0 bottom-0 z-50 flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        <div
          className="w-full max-w-3xl mx-auto px-4 pb-6 flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header with close */}
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-all" aria-label="Close overlay">
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Form modes */}
          {mode === 'contact' && (
            <ContactForm onBackToChat={handleBackToChat} />
          )}
          {mode === 'meeting' && (
            <MeetingForm onBackToChat={handleBackToChat} />
          )}
          {mode === 'project_match' && (
            <ProjectMatchForm
              onBackToChat={handleBackToChat}
              projects={projects}
            />
          )}

          {/* Chat input mode */}
          {mode === 'chat' && (
            <div className="relative group flex-shrink-0 premium-input-wrapper">
              <div className="input-glow absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-500 rounded-2xl" />
              <div className="relative bg-[#0F172A]/85 border border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-xl focus-within:border-purple-500/40 focus-within:shadow-[0_0_40px_rgba(139,92,246,0.12)] transition-all duration-300 overflow-hidden">
                {/* Feature bar INSIDE input area */}
                <AdvancedFeaturesBar activeMode={mode} onModeChange={handleModeChange} />

                {/* Suggestions row - always visible */}
                {suggestions && suggestions.length > 0 && (
                  <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
                    {suggestions.map((suggestion, idx) => {
                      const colors = getColor(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => { onSuggestionClick?.(suggestion.label); onClose(); }}
                          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${colors.border} ${colors.bg} ${colors.hoverBorder} text-white text-[11px] font-medium font-sans transition-all duration-300 hover:scale-[1.03] ${colors.glow}`}
                        >
                          <span className="text-white/70 text-xs">{suggestion.icon}</span>
                          {suggestion.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Textarea + Send */}
                <div className="flex items-end p-3">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about my work..."
                    maxLength={2000}
                    rows={2}
                    className="flex-1 bg-transparent border-none text-white px-2 py-2 focus:outline-none placeholder-gray-500 text-sm resize-none"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] text-gray-600">{inputValue.length}/2000</span>
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isLoading}
                      className="p-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
                      aria-label="Send message"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiSend className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
