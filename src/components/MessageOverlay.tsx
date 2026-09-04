// src/components/MessageOverlay.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   MESSAGE OVERLAY — Anime.js v4 animations
   Spring entrance for quick suggestion chips, animated typing dots.
══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { FiSend, FiX, FiSliders } from 'react-icons/fi';
import * as LucideIcons from 'lucide-react';
import {
  createScope,
  animate,
  stagger,
  spring,
} from 'animejs';
import AdvancedFeaturesBar, { FeatureMode } from './AdvancedFeaturesBar';
import ContactForm from './ContactForm';
import MeetingForm from './MeetingForm';
import ProjectMatchForm from './ProjectMatchForm';
import SkillFilterPanel from './SkillFilterPanel';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import {
  HudPanel,
  NeonButton,
  Ripple,
  TypeaheadSuggestions,
  useTypeaheadSuggestions,
} from './ui';
import { isReducedMotion } from '../config/animations';
import { useEnhancedTypeaheadSuggestions } from '../hooks/useEnhancedSuggestions';

type SuggestionShape = {
  label: string;
  icon?: React.ReactNode;
  match?: string[];
};

const QUICK_SUGGESTIONS: SuggestionShape[] = [
  { label: 'Show me your projects', icon: <LucideIcons.Briefcase size={18} />, match: ['projects', 'work'] },
  { label: 'What are your skills?', icon: <LucideIcons.Code size={18} />, match: ['skills', 'tech'] },
  { label: 'Which frameworks do you use?', icon: <LucideIcons.Layers size={18} />, match: ['frameworks', 'tools'] },
  { label: 'Tell me about yourself', icon: <LucideIcons.User size={18} />, match: ['about', 'bio'] },
  { label: 'Show your experience', icon: <LucideIcons.Clock size={18} />, match: ['experience', 'work'] },
  { label: 'How can I contact you?', icon: <LucideIcons.Mail size={18} />, match: ['contact', 'email'] },
];

type MessageOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string, skillFilter?: number[]) => void;
  isLoading: boolean;
  suggestions?: SuggestionShape[];
  onSuggestionClick?: (label: string) => void;
  projects: PortfolioProject[];
  skills?: PortfolioSkill[];
  conversationHistory?: string[];
  useEnhancedSuggestions?: boolean;
};

function TypingDots() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return;
    const dots = containerRef.current.querySelectorAll('.typing-dot');
    if (!dots.length) return;
    animate(dots, {
      scale: [1, 1.4, 1],
      opacity: [0.4, 1, 0.4],
      duration: 800,
      loop: true,
      ease: 'inOutSine',
      delay: stagger(200),
    });
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-1 px-3 py-2">
      <div className="typing-dot w-2 h-2 rounded-full bg-neon-cyan opacity-60" />
      <div className="typing-dot w-2 h-2 rounded-full bg-neon-cyan opacity-60" />
      <div className="typing-dot w-2 h-2 rounded-full bg-neon-cyan opacity-60" />
    </div>
  );
}

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
  skills = [],
  conversationHistory = [],
  useEnhancedSuggestions = false,
}: MessageOverlayProps) {
  const [mode, setMode] = useState<FeatureMode>('chat');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [skillFilter, setSkillFilter] = useState<number[]>([]);
  const [showSkillFilter, setShowSkillFilter] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const enhancedSuggestions = useEnhancedTypeaheadSuggestions(
    inputValue,
    8,
    conversationHistory || [],
  );

  const basicSuggestionPool = useMemo(() => {
    return (suggestions ?? []).map((s, i) => ({
      id: `s-${i}`,
      label: s.label,
      hint: s.icon ? undefined : undefined,
      payload: s,
    }));
  }, [suggestions]);

  const suggestionPool = useEnhancedSuggestions
    ? enhancedSuggestions
    : basicSuggestionPool;

  const filtered = useTypeaheadSuggestions(inputValue, suggestionPool, 8);

  // Entrance animation for backdrop + panel
  useEffect(() => {
    if (!isOpen) return;
    if (isReducedMotion()) return;
    if (backdropRef.current) {
      animate(backdropRef.current, { opacity: [0, 1], duration: 200, ease: 'outExpo' });
    }
    if (panelRef.current) {
      animate(panelRef.current, {
        y: [60, 0],
        opacity: [0, 1],
        duration: 320,
        ease: 'outExpo',
      });
    }
  }, [isOpen]);

  // Stagger entrance for quick suggestion chips
  useEffect(() => {
    if (isReducedMotion() || !chipsRef.current || inputValue.length > 0) return;

    const scope = createScope({ root: chipsRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const chips = chipsRef.current!.querySelectorAll('.suggestion-chip');
      if (!chips.length) return;
      animate(chips, {
        opacity: [0, 1],
        y: [16, 0],
        scale: [0.9, 1],
        delay: stagger(60, { from: 'first' }),
        ...spring({ stiffness: 160, damping: 14 }),
      });
    });

    return () => scope.revert();
  }, [inputValue]);

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
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSend(inputValue, skillFilter.length > 0 ? skillFilter : undefined);
      setSkillFilter([]);
    }
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

  const handleQuickSuggestion = (label: string) => {
    onSend(label, skillFilter.length > 0 ? skillFilter : undefined);
    setSkillFilter([]);
  };

  return (
    <>
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md opacity-0"
      />
      <div
        ref={panelRef}
        className="fixed left-0 right-0 bottom-0 z-50 flex flex-col opacity-0"
        style={{ maxHeight: '85vh' }}
      >
        <div
          className="w-full max-w-3xl mx-auto px-4 pb-6 flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          <div className="flex justify-end mb-2">
            <NeonButton variant="ghost" accent="magenta" onClick={onClose} iconLeft={<FiX />}>
              CLOSE
            </NeonButton>
          </div>

          {mode === 'contact' && <ContactForm onBackToChat={handleBackToChat} />}
          {mode === 'meeting' && <MeetingForm onBackToChat={handleBackToChat} />}
          {mode === 'project_match' && <ProjectMatchForm onBackToChat={handleBackToChat} projects={projects} />}

          {mode === 'chat' && (
            <Ripple color="rgba(255,170,0,0.4)">
              <HudPanel accent="yellow" notch="md" className="overflow-hidden hud-glow-yellow">
                <AdvancedFeaturesBar activeMode={mode} onModeChange={setMode} />

                {inputValue.length === 0 && (
                  <div className="p-3 border-t border-white/5">
                    <div className="text-[9px] font-display tracking-[2px] text-text-muted mb-2">
                      {'// QUICK COMMANDS'}
                    </div>
                    <div ref={chipsRef} className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {QUICK_SUGGESTIONS.map((s, i) => {
                        const accents = ['cyan', 'magenta', 'yellow'] as const;
                        const accent = accents[i % accents.length];
                        return (
                          <button
                            key={s.label}
                            onClick={() => handleQuickSuggestion(s.label)}
                            className={`suggestion-chip p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-neon-${accent}/10 hover:border-neon-${accent}/30 transition-colors text-left opacity-0`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-neon-${accent}`}>{s.icon}</span>
                              <span className="text-[10px] font-display tracking-wider text-text-primary leading-tight">
                                {s.label.split(' ').slice(0, 3).join(' ').toUpperCase()}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {suggestions && suggestions.length > 0 && inputValue.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <TypeaheadSuggestions
                      query={inputValue}
                      suggestions={filtered}
                      onSelect={(s) => onSuggestionClick?.((s.payload as SuggestionShape)?.label ?? s.label)}
                      open
                    />
                  </div>
                )}

                {showSkillFilter && skills.length > 0 && (
                  <SkillFilterPanel skills={skills} selectedIds={skillFilter} onChange={setSkillFilter} />
                )}

                {skillFilter.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-text-muted">FILTERED BY:</span>
                    {skillFilter.map((id) => {
                      const skill = skills.find((s) => s.id === id);
                      if (!skill) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg text-[10px] text-neon-cyan">
                          {skill.name}
                          <button onClick={() => setSkillFilter((prev) => prev.filter((i) => i !== id))} className="hover:text-red-400">
                            <FiX size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-end p-3 border-t border-white/5">
                  {skills.length > 0 && (
                    <button
                      onClick={() => setShowSkillFilter(!showSkillFilter)}
                      className={`p-2 rounded-lg mr-2 transition-all ${showSkillFilter ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-text-muted hover:text-white'}`}
                      title="Filter by skills"
                    >
                      <FiSliders size={16} />
                    </button>
                  )}
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about my development projects, skills, or experience..."
                    maxLength={2000}
                    rows={2}
                    className="flex-1 bg-transparent border-none text-text-primary px-2 py-2 focus:outline-none placeholder-text-muted text-sm font-body resize-none focus:shadow-[0_0_12px_var(--glow-yellow)] transition-all duration-200"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] font-mono text-text-muted">{inputValue.length}/2000</span>
                    <NeonButton accent="yellow" iconRight={isLoading ? undefined : <FiSend />} loading={isLoading} onClick={handleSend} disabled={!inputValue.trim()}>
                      SEND
                    </NeonButton>
                  </div>
                </div>

                {isLoading && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <HudPanel accent="cyan" notch="sm" className="inline-flex items-center gap-2">
                      <span className="text-[9px] font-mono text-text-muted mr-2">PROCESSING:</span>
                      <TypingDots />
                    </HudPanel>
                  </div>
                )}
              </HudPanel>
            </Ripple>
          )}
        </div>
      </div>
    </>
  );
}
