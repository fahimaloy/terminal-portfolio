// src/components/Homepage.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  FiSend,
  FiCode,
  FiBriefcase,
  FiGithub,
  FiUser,
  FiRotateCcw,
  FiStar,
} from 'react-icons/fi';
import config from '../../config.json';
import {
  getPortfolioProfile,
  PortfolioProfile,
  getPortfolioProjects,
  PortfolioProject,
} from '../utils/api';
import SEOMeta from './SEOMeta';
import ChatMessage from './ChatMessage';
import MessageOverlay from './MessageOverlay';
import {
  GlitchText,
  HudPanel,
  NeonButton,
  Ripple,
  StatBar,
  Tilt3D,
} from './ui';

type Message = { role: 'user' | 'model'; text: string };

const SUGGESTIONS = [
  { label: 'What are your core skills?', icon: <FiCode />, match: ['skills', 'tech'] },
  { label: 'Tell me about your recent projects.', icon: <FiBriefcase />, match: ['projects', 'work'] },
  { label: 'Where can I find your GitHub?', icon: <FiGithub />, match: ['github', 'code'] },
  { label: 'What is your professional background?', icon: <FiUser />, match: ['about', 'bio'] },
];

const ACCENTS = ['yellow', 'magenta', 'cyan', 'green'] as const;

export default function Homepage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [detailProject, setDetailProject] = useState<PortfolioProject | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [now, setNow] = useState<string>('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const load = async () => {
      setIsDataLoading(true);
      const [p, pr] = await Promise.all([
        getPortfolioProfile(),
        getPortfolioProjects(),
      ]);
      if (p) setProfile(p);
      setProjects(pr);
      setIsDataLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100,
      );
    }
  }, [messages]);

  // HUD clock widget
  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    const updated = [...messagesRef.current, { role: 'user' as const, text }];
    setMessages(updated);
    setIsLoading(true);
    try {
      const res = await axios.post('/api/chat', { messages: updated });
      const reply = res.data?.text || "I'm sorry, I couldn't reach the server right now.";
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Oops! Something went wrong while fetching the answer.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setShowProjectDetail(false);
    setDetailProject(null);
  };

  const isInitial = messages.length === 0 && !showProjectDetail;

  return (
    <div className="min-h-screen relative z-10">
      <SEOMeta
        title={profile?.full_name || config.name || 'Fahim Ahmed'}
        description={profile?.bio || 'Portfolio of Fahim Ahmed - Full-Stack Developer'}
        image={profile?.avatar_url}
        path="/"
      />

      {/* HUD chrome (4 corners) — fixed */}
      <div className="pointer-events-none fixed inset-0 z-20">
        {/* Top-left: ROOT.USER */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <HudPanel accent="yellow" notch="md" className="p-3 inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-yellow to-neon-magenta flex items-center justify-center font-display text-black text-sm shadow-[0_0_12px_var(--glow-yellow)]">
              {(profile?.full_name || 'FA').charAt(0)}
            </div>
            <div>
              <div className="text-[9px] font-display tracking-[3px] text-neon-yellow text-shadow-neon-yellow">
                {'// ROOT.USER'}
              </div>
              <div className="text-sm font-display tracking-wider text-text-primary">
                {profile?.full_name?.split(' ')[0] || 'Fahim'}
              </div>
            </div>
          </HudPanel>
        </div>

        {/* Top-right: SYS.STATUS + clock */}
        <div className="absolute top-4 right-4 pointer-events-auto flex flex-col items-end gap-2">
          <HudPanel accent="cyan" notch="md" className="p-2 px-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-dot shadow-[0_0_8px_var(--neon-green)]" />
              <span className="text-[10px] font-display tracking-[2px] text-neon-cyan text-shadow-neon-cyan">
                ONLINE
              </span>
            </div>
          </HudPanel>
          <div className="text-[10px] font-mono text-text-muted">{now}</div>
        </div>

        {/* Bottom-left: LATEST TRANSMISSION */}
        {messages.length > 0 && (
          <div className="absolute bottom-28 left-4 max-w-[260px] pointer-events-auto">
            <HudPanel accent="magenta" notch="md" className="p-3">
              <div className="text-[9px] font-display tracking-[3px] text-neon-magenta text-shadow-neon-magenta mb-1">
                {'\u25BC LATEST TRANSMISSION'}
              </div>
              <div className="text-[11px] font-body text-text-secondary line-clamp-2">
                {messages[messages.length - 1]?.text}
              </div>
            </HudPanel>
          </div>
        )}

        {/* Bottom-right: SYSTEM */}
        <div className="absolute bottom-28 right-4 pointer-events-auto">
          <HudPanel accent="cyan" notch="md" className="p-3 text-right">
            <div className="text-[9px] font-display tracking-[3px] text-neon-cyan text-shadow-neon-cyan">
              SYSTEM v3.4.2
            </div>
            <div className="text-[9px] font-mono text-text-muted mt-0.5">
              UPLINK: STABLE
            </div>
          </HudPanel>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`relative z-10 flex-1 flex flex-col items-center px-4 w-full max-w-4xl mx-auto transition-all duration-500 ${
          isInitial && !isDataLoading ? 'justify-center pb-[18vh] pt-[10vh]' : 'justify-end pb-6 pt-[10vh]'
        }`}
      >
        {isInitial && !isDataLoading && (
          <div className="flex flex-col items-center w-full animate-fade-in-up">
            <div className="text-[10px] font-display tracking-[6px] text-neon-magenta text-shadow-neon-magenta mb-2">
              {'// OPERATIVE PROFILE'}
            </div>
            <GlitchText as="h1" accent="magenta" className="text-4xl md:text-6xl">
              {profile?.full_name?.toUpperCase() || 'FAHIM AHMED'}
            </GlitchText>
            <div className="font-body text-text-secondary text-sm md:text-base tracking-widest mt-3">
              FULL-STACK{' '}
              <span className="text-neon-yellow text-shadow-neon-yellow font-display tracking-[2px]">
                DEVELOPER
              </span>
            </div>
            {profile?.bio && (
              <div className="text-text-muted text-xs md:text-sm font-body text-center mt-5 max-w-lg">
                {profile.bio}
              </div>
            )}

            <div className="flex gap-3 mt-7">
              <NeonButton accent="yellow" onClick={() => setShowOverlay(true)}>
                DEPLOY
              </NeonButton>
              <NeonButton
                accent="cyan"
                variant="outline"
                onClick={() => window.open('https://github.com/fahimaloy', '_blank')}
              >
                SCAN GITHUB
              </NeonButton>
            </div>

            {/* Suggestion cards above input */}
            <div className="mt-12 w-full">
              <div className="text-[9px] font-display tracking-[3px] text-text-muted text-center mb-3">
                {'// QUICK COMMANDS'}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
{SUGGESTIONS.map((s, idx) => {
                   const accent = ACCENTS[idx % ACCENTS.length];
                   const glowClass = `hud-glow-${accent}`;
                   const textShadowClass = accent === 'yellow' ? 'text-shadow-neon-yellow' : accent === 'magenta' ? 'text-shadow-neon-magenta' : accent === 'cyan' ? 'text-shadow-neon-cyan' : 'text-shadow-neon-green';
                   return (
                     <Tilt3D key={s.label}>
                       <Ripple
                         onClick={() => handleSend(s.label)}
                         className={`clip-notch-md bg-bg-smoke hover:bg-bg-ash p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${glowClass}`}
                         color={accent === 'yellow' ? 'rgba(255,170,0,0.4)' : accent === 'magenta' ? 'rgba(255,0,170,0.4)' : accent === 'cyan' ? 'rgba(0,240,255,0.4)' : 'rgba(57,255,20,0.4)'}
                       >
                         <div className="text-center">
                           <div
                             className={`text-2xl mb-2 text-${accent} ${textShadowClass}`}
                           >
                             {s.icon}
                           </div>
                           <div className="font-display text-[10px] tracking-[2px] text-text-primary">
                             {s.label.split(' ').slice(0, 2).join(' ').toUpperCase()}
                           </div>
                         </div>
                       </Ripple>
                     </Tilt3D>
                   );
                 })}
              </div>
            </div>
          </div>
        )}

        {isInitial && isDataLoading && (
          <div className="w-full max-w-2xl space-y-3 animate-pulse-glow">
            <StatBar label="LOADING" value={40} accent="yellow" />
            <StatBar label="SYNCING" value={70} accent="magenta" />
            <StatBar label="READY" value={20} accent="cyan" />
          </div>
        )}

        {!isInitial && (
          <div className="w-full flex-1 overflow-y-auto mb-4 pr-2" role="log" aria-live="polite">
            <div className="flex flex-col gap-4 py-4">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} role={msg.role} text={msg.text} projects={projects} />
              ))}
              {isLoading && (
                <div className="flex w-full justify-start">
                  <HudPanel accent="cyan" notch="sm" className="px-4 py-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-dot" />
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-dot [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-dot [animation-delay:0.4s]" />
                  </HudPanel>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {!isInitial && projects.length > 0 && (
          <div className="w-full mb-4">
            <div className="flex flex-wrap justify-center gap-3">
              {projects.slice(0, 4).map((project, idx) => {
                const accent = ACCENTS[(idx + 3) % ACCENTS.length];
                return (
                  <Ripple
                    key={project.id}
                    onClick={() => {
                      setDetailProject(project);
                      setShowProjectDetail(true);
                    }}
                    className="w-[150px] cursor-pointer"
                  >
                    <HudPanel accent={accent} notch="sm" className="p-2 hud-glow-yellow">
                      <div className="w-full h-16 overflow-hidden bg-black/40 mb-2">
                        {project.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={project.thumbnail_url}
                            alt={project.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <FiStar />
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-display tracking-[1.5px] text-center text-text-primary">
                        {project.short_title || project.title}
                      </div>
                    </HudPanel>
                  </Ripple>
                );
              })}
            </div>
          </div>
        )}

        {showProjectDetail && detailProject && (
          <div className="w-full mb-4">
            <HudPanel accent="yellow" notch="md" className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 overflow-hidden bg-black/40 flex-shrink-0">
                  {detailProject.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detailProject.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <FiBriefcase />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base text-text-primary tracking-wider">
                    {detailProject.title}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailProject.languages?.map((l, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-display tracking-[1px] px-1.5 py-0.5 bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowProjectDetail(false);
                    setDetailProject(null);
                  }}
                  className="text-text-muted hover:text-text-primary text-lg"
                  aria-label="Close project"
                >
                  ×
                </button>
              </div>
            </HudPanel>
          </div>
        )}

        {/* Main input bar — fixed at bottom */}
        <div className="w-full relative z-30">
          <Ripple className="clip-notch-md" color="rgba(255,170,0,0.4)">
            <HudPanel
              accent="yellow"
              notch="md"
              className="p-1.5 flex items-center gap-2 cursor-text hud-glow-yellow"
              onClick={() => setShowOverlay(true)}
            >
              <span className="font-display text-neon-yellow text-shadow-neon-yellow pl-3 text-lg">
                &gt;
              </span>
              <input
                type="text"
                className="flex-1 bg-transparent border-none text-text-primary px-2 py-2.5 focus:outline-none placeholder-text-muted text-sm font-body cursor-text focus:shadow-[0_0_12px_var(--glow-yellow)] transition-all duration-200"
                placeholder="Ask anything about my work…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setShowOverlay(true)}
                readOnly
                aria-label="Open chat"
              />
              {!isInitial && (
                <NeonButton
                  variant="ghost"
                  accent="cyan"
                  iconLeft={<FiRotateCcw />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                >
                  RESET
                </NeonButton>
              )}
              <NeonButton
                accent="yellow"
                iconRight={<FiSend />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (input.trim()) handleSend(input);
                  else setShowOverlay(true);
                }}
              >
                SEND
              </NeonButton>
            </HudPanel>
          </Ripple>
        </div>
      </div>

      <MessageOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        inputValue={input}
        onInputChange={setInput}
        onSend={(text) => {
          handleSend(text);
          setShowOverlay(false);
        }}
        isLoading={isLoading}
        suggestions={SUGGESTIONS}
        onSuggestionClick={(label) => {
          handleSend(label);
          setShowOverlay(false);
        }}
        projects={projects}
      />
    </div>
  );
}
