// src/components/MessageOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiX } from 'react-icons/fi';
import AdvancedFeaturesBar, { FeatureMode } from './AdvancedFeaturesBar';
import ContactForm from './ContactForm';
import MeetingForm from './MeetingForm';
import ProjectMatchForm from './ProjectMatchForm';
import { PortfolioProject } from '../utils/api';
import {
  HudPanel,
  NeonButton,
  Ripple,
  TypeaheadSuggestions,
  useTypeaheadSuggestions,
} from './ui';

type SuggestionShape = {
  label: string;
  icon?: React.ReactNode;
  match?: string[];
};

type MessageOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  suggestions?: SuggestionShape[];
  onSuggestionClick?: (label: string) => void;
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

  // Adapt the home suggestions (label/icon/match) to the hook's Suggestion shape
  const suggestionPool = (suggestions ?? []).map((s, i) => ({
    id: `s-${i}`,
    label: s.label,
    hint: s.icon ? undefined : undefined,
    payload: s,
  }));
  const filtered = useTypeaheadSuggestions(inputValue, suggestionPool, 5);

  useEffect(() => {
    if (isOpen && mode === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'chat') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, mode]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) onSend(inputValue);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBackToChat = () => {
    setMode('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 right-0 bottom-0 z-50 flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        <div
          className="w-full max-w-3xl mx-auto px-4 pb-6 flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          <div className="flex justify-end mb-2">
            <NeonButton
              variant="ghost"
              accent="magenta"
              onClick={onClose}
              iconLeft={<FiX />}
            >
              CLOSE
            </NeonButton>
          </div>

          {mode === 'contact' && <ContactForm onBackToChat={handleBackToChat} />}
          {mode === 'meeting' && <MeetingForm onBackToChat={handleBackToChat} />}
          {mode === 'project_match' && (
            <ProjectMatchForm
              onBackToChat={handleBackToChat}
              projects={projects}
            />
          )}

          {mode === 'chat' && (
            <Ripple color="rgba(255,170,0,0.4)">
              <HudPanel
                accent="yellow"
                notch="md"
                className="overflow-hidden hud-glow-yellow"
              >
                <AdvancedFeaturesBar activeMode={mode} onModeChange={setMode} />

                {suggestions && suggestions.length > 0 && inputValue.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <TypeaheadSuggestions
                      query={inputValue}
                      suggestions={filtered}
                      onSelect={(s) =>
                        onSuggestionClick?.((s.payload as SuggestionShape)?.label ?? s.label)
                      }
                      open
                    />
                  </div>
                )}

                <div className="flex items-end p-3 border-t border-white/5">
<textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => onInputChange(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Ask anything about my work…"
                      maxLength={2000}
                      rows={2}
                      className="flex-1 bg-transparent border-none text-text-primary px-2 py-2 focus:outline-none placeholder-text-muted text-sm font-body resize-none focus:shadow-[0_0_12px_var(--glow-yellow)] transition-all duration-200"
                      disabled={isLoading}
                    />
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] font-mono text-text-muted">
                      {inputValue.length}/2000
                    </span>
                    <NeonButton
                      accent="yellow"
                      iconRight={isLoading ? undefined : <FiSend />}
                      loading={isLoading}
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                    >
                      SEND
                    </NeonButton>
                  </div>
                </div>
              </HudPanel>
            </Ripple>
          )}
        </div>
      </motion.div>
    </>
  );
}
