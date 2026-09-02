// src/components/Homepage.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   HOMEPAGE — Enhanced with Anime.js v4 animations
   - Stagger entrance for hero section
   - 3D tilt on quick cards
   - Pulsing CTA button
   - Animated stat bars
   - Scroll-reactive HUD
   - Spring physics for interactive elements
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  FiSend,
  FiRotateCcw,
} from 'react-icons/fi';
import {
  Briefcase,
  Code,
  Layers,
  User,
  Clock,
  Mail,
  GitBranch,
  Link,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';
import {
  createTimeline,
  createScope,
  animate,
  spring,
  stagger,
} from 'animejs';
import config from '../../config.json';
import {
  getPortfolioProfile,
  PortfolioProfile,
  getPortfolioProjects,
  PortfolioProject,
  getPortfolioSkills,
  PortfolioSkill,
  getPortfolioExperiences,
  PortfolioExperience,
  getSiteTexts,
} from '../utils/api';
import SEOMeta from './SEOMeta';
import ChatMessage from './ChatMessage';
import MessageOverlay from './MessageOverlay';
import ScrollIndicator from './HUD/ScrollIndicator';
import {
  GlitchText,
  HudPanel,
  NeonButton,
  Ripple,
  StatBar,
  Tilt3D,
  useStagger,
  useHover,
} from './ui';
import { isReducedMotion } from '../config/animations';

type Message = {
  role: 'user' | 'model';
  text: string;
  responseType?: string;
  responseData?: any;
};

const QUICK_CARDS = [
  { label: 'MY GITHUB', icon: <GitBranch size={22} />, accent: 'cyan' as const, message: 'Show me your GitHub' },
  { label: 'MY LINKEDIN', icon: <Link size={22} />, accent: 'cyan' as const, message: 'Show me your LinkedIn' },
  { label: 'EMAIL ME', icon: <Mail size={22} />, accent: 'yellow' as const, message: 'How can I contact you?' },
  { label: 'MY PROJECTS', icon: <Briefcase size={22} />, accent: 'magenta' as const, message: 'Show me your projects' },
  { label: 'MY SKILLSETS', icon: <Code size={22} />, accent: 'green' as const, message: 'Show me your skills' },
  { label: 'MY EXPERIENCE', icon: <Clock size={22} />, accent: 'cyan' as const, message: 'Show me your experience' },
];

const SUGGESTIONS = [
  { label: 'What are your core skills?', icon: <Code size={16} />, match: ['skills', 'tech'] },
  { label: 'Tell me about your recent projects.', icon: <Briefcase size={16} />, match: ['projects', 'work'] },
  { label: 'Where can I find your GitHub?', icon: <GitBranch size={16} />, match: ['github', 'code'] },
  { label: 'What is your professional background?', icon: <User size={16} />, match: ['about', 'bio'] },
];

const ACCENTS = ['yellow', 'magenta', 'cyan', 'green'] as const;

// Animated counter hook
function useCounter(target: number, duration: number = 2000, delay: number = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (isReducedMotion()) { setValue(target); return; }
    const timer = setTimeout(() => {
      const obj = { val: 0 };
      animate(obj, {
        val: [0, target],
        duration,
        ease: 'outExpo',
        onUpdate: () => setValue(Math.round(obj.val)),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return value;
}

export default function Homepage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [skills, setSkills] = useState<PortfolioSkill[]>([]);
  const [experiences, setExperiences] = useState<PortfolioExperience[]>([]);
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [detailProject, setDetailProject] = useState<PortfolioProject | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [now, setNow] = useState<string>('');
  const [heroReady, setHeroReady] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  // Animated stats
  const projectCount = useCounter(projects.length, 1500, 800);
  const skillCount = useCounter(skills.length, 1500, 1000);
  const expCount = useCounter(experiences.length, 1500, 1200);

  // Keep the ref synchronized on every render so handleSend reads
  // the latest messages without waiting for an effect to flush.
  messagesRef.current = messages;

  useEffect(() => {
    const load = async () => {
      setIsDataLoading(true);
      const [p, pr, sk, exp, texts] = await Promise.all([
        getPortfolioProfile(),
        getPortfolioProjects(),
        getPortfolioSkills(),
        getPortfolioExperiences(),
        getSiteTexts(),
      ]);
      if (p) setProfile(p);
      setProjects(pr);
      setSkills(sk);
      setExperiences(exp);
      setSiteTexts(texts);
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

  // HUD clock
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

  // Hero entrance animation
  useEffect(() => {
    if (isDataLoading || !heroRef.current || isReducedMotion()) {
      setHeroReady(true);
      return;
    }

    const scope = createScope({ root: heroRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const tl = createTimeline({ defaults: { ease: 'outExpo' } });

      // Phase 1: Label fade-in
      const label = heroRef.current!.querySelector('.hero-label');
      if (label) {
        tl.add(label, { opacity: [0, 1], y: [8, 0], duration: 400 }, 0);
      }

      // Phase 2: Name scramble-in
      const name = heroRef.current!.querySelector('.hero-name');
      if (name) {
        tl.add(name, {
          opacity: [0, 1],
          y: [20, 0],
          scale: [0.95, 1],
          ...spring({ stiffness: 100, damping: 12 }),
        }, 200);
      }

      // Phase 3: Title typewriter-style fade
      const title = heroRef.current!.querySelector('.hero-title');
      if (title) {
        tl.add(title, { opacity: [0, 1], y: [10, 0], duration: 400 }, 600);
      }

      // Phase 4: Bio fade
      const bio = heroRef.current!.querySelector('.hero-bio');
      if (bio) {
        tl.add(bio, { opacity: [0, 1], y: [10, 0], duration: 400 }, 800);
      }

      // Phase 5: Buttons stagger
      const btns = heroRef.current!.querySelectorAll('.hero-btn');
      if (btns) {
        tl.add(btns, {
          opacity: [0, 1],
          y: [12, 0],
          duration: 350,
          delay: stagger(80),
        }, 1000);
      }

      // Phase 6: Quick cards stagger
      const cards = heroRef.current!.querySelectorAll('.quick-card');
      if (cards) {
        tl.add(cards, {
          opacity: [0, 1],
          y: [24, 0],
          scale: [0.92, 1],
          delay: stagger(60, { from: 'first' }),
          ...spring({ stiffness: 150, damping: 14 }),
        }, 1200);
      }

      // Mark ready after animation starts
      setTimeout(() => setHeroReady(true), 100);
    });

    return () => {
      scope.revert();
    };
  }, [isDataLoading]);

  const handleSend = async (text: string, skillFilter?: number[]) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    setConversationHistory((prev) => [...prev, text].slice(-10));

    const userMessage = { role: 'user' as const, text };
    const updated = [...messagesRef.current, userMessage];
    // Update synchronously so a rapid second call sees the new value.
    messagesRef.current = updated;
    setMessages(updated);
    setIsLoading(true);
    try {
      const res = await axios.post('/api/chat', {
        messages: updated,
        skill_filter: skillFilter,
      });
      const reply =
        res.data?.text || "I'm sorry, I couldn't reach the server right now.";
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: reply,
          responseType: res.data?.type || res.data?.response_type,
          responseData: res.data?.data,
        },
      ]);
      setConversationHistory((prev) => [...prev, reply].slice(-10));
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Oops! Something went wrong while fetching the answer.',
        },
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
        description={
          profile?.bio ||
          'Full-Stack Web & App Developer | Building digital solutions with modern technologies'
        }
        image={profile?.avatar_url ?? undefined}
        path="/"
      />

      {/* Scroll progress indicator */}
      <ScrollIndicator />

      {/* HUD chrome */}
      <div className="pointer-events-none fixed inset-0 z-20">
        {/* Top-left: ROOT.USER */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <HudPanel
            accent="yellow"
            notch="md"
            className="p-3 inline-flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-yellow to-neon-magenta flex items-center justify-center font-display text-black text-sm shadow-[0_0_12px_var(--glow-yellow)]">
              {(profile?.full_name || 'FA').charAt(0)}
            </div>
            <div>
              <div className="text-[9px] font-display tracking-[3px] text-neon-yellow text-shadow-neon-yellow">
                {'// ' + (siteTexts.developer_label || 'DEVELOPER')}
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
                {siteTexts.active_label || 'ACTIVE'}
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
                {'\u25BC ' + (siteTexts.last_command_label || 'LAST COMMAND')}
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
              {siteTexts.terminal_version || 'TERMINAL v4.0.0'}
            </div>
            <div className="text-[9px] font-mono text-text-muted mt-0.5">
              {siteTexts.status_ready || 'STATUS: READY'}
            </div>
          </HudPanel>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`relative z-10 flex-1 flex flex-col items-center px-4 w-full max-w-4xl mx-auto transition-all duration-500 ${
          isInitial && !isDataLoading
            ? 'justify-center pb-[18vh] pt-[10vh]'
            : 'justify-end pb-6 pt-[10vh]'
        }`}
      >
        {/* Loading skeleton */}
        {isInitial && isDataLoading && (
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="h-4 w-32 bg-white/5 animate-pulse rounded" />
            <div className="h-12 w-64 bg-white/5 animate-pulse rounded" />
            <div className="h-6 w-48 bg-white/5 animate-pulse rounded" />
            <div className="h-4 w-80 bg-white/5 animate-pulse rounded mt-2" />
            <div className="flex gap-8 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="h-8 w-12 bg-white/5 animate-pulse rounded" />
                  <div className="h-2 w-12 bg-white/5 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Hero Section */}
        {isInitial && !isDataLoading && (
          <div
            ref={heroRef}
            className="flex flex-col items-center w-full"
            id="hero"
          >
            {/* Animated label */}
            <div className="hero-label text-[10px] font-display tracking-[6px] text-neon-magenta text-shadow-neon-magenta mb-2 opacity-0">
              {'// ' + (siteTexts.developer_profile_label || 'DEVELOPER PROFILE')}
            </div>

            {/* Name with glitch */}
            <GlitchText
              as="h1"
              accent="magenta"
              className="hero-name text-4xl md:text-6xl opacity-0"
            >
              {profile?.full_name?.toUpperCase() || 'FAHIM AHMED'}
            </GlitchText>

            {/* Title */}
            <div className="hero-title font-body text-text-secondary text-sm md:text-base tracking-widest mt-3 opacity-0">
              FULL-STACK{' '}
              <span className="text-neon-yellow text-shadow-neon-yellow font-display tracking-[2px]">
                DEVELOPER
              </span>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div className="hero-bio text-text-muted text-xs md:text-sm font-body text-center mt-5 max-w-lg opacity-0">
                {profile.bio}
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-8 mt-6 opacity-0" style={{ animation: 'none' }}>
              <div className="text-center">
                <div className="text-2xl font-display text-neon-cyan text-shadow-neon-cyan">{projectCount}+</div>
                <div className="text-[9px] font-display tracking-[2px] text-text-muted">PROJECTS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-display text-neon-magenta text-shadow-neon-magenta">{skillCount}+</div>
                <div className="text-[9px] font-display tracking-[2px] text-text-muted">SKILLS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-display text-neon-yellow text-shadow-neon-yellow">{expCount}+</div>
                <div className="text-[9px] font-display tracking-[2px] text-text-muted">EXPERIENCE</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mt-7">
              <NeonButton
                accent="yellow"
                onClick={() => setShowOverlay(true)}
                className="hero-btn opacity-0"
              >
                START CHAT
              </NeonButton>
              <NeonButton
                accent="cyan"
                variant="outline"
                onClick={() => window.open('https://github.com/fahimaloy', '_blank')}
                className="hero-btn opacity-0"
              >
                VIEW CODE
              </NeonButton>
              <NeonButton
                accent="magenta"
                variant="outline"
                onClick={() => router.push('/blog')}
                className="hero-btn opacity-0"
              >
                READ BLOG
              </NeonButton>
            </div>

            {/* Quick access cards */}
            <div ref={cardsRef} className="mt-12 w-full" id="quick-commands">
              <div className="text-[9px] font-display tracking-[3px] text-text-muted text-center mb-3">
                {'// ' + (siteTexts.quick_commands_label || 'QUICK COMMANDS')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_CARDS.map((card) => {
                  const accent = card.accent;
                  const glowClass = `hud-glow-${accent}`;
                  const textShadowClass =
                    accent === 'yellow' ? 'text-shadow-neon-yellow'
                    : accent === 'magenta' ? 'text-shadow-neon-magenta'
                    : accent === 'cyan' ? 'text-shadow-neon-cyan'
                    : 'text-shadow-neon-green';
                  const iconColor =
                    accent === 'yellow' ? 'text-neon-yellow'
                    : accent === 'magenta' ? 'text-neon-magenta'
                    : accent === 'cyan' ? 'text-neon-cyan'
                    : 'text-neon-green';
                  return (
                    <Tilt3D key={card.label} intensity={3}>
                      <Ripple
                        onClick={() => handleSend(card.message)}
                        className={`quick-card clip-notch-md bg-bg-smoke p-4 cursor-pointer ${glowClass} hover:bg-bg-ash transition-colors duration-200 opacity-0`}
                        color={
                          accent === 'yellow' ? 'rgba(255,170,0,0.4)'
                          : accent === 'magenta' ? 'rgba(255,0,170,0.4)'
                          : accent === 'cyan' ? 'rgba(0,240,255,0.4)'
                          : 'rgba(57,255,20,0.4)'
                        }
                      >
                        <div className="text-center">
                          <div className={`text-2xl mb-2 ${iconColor} ${textShadowClass}`}>
                            {card.icon}
                          </div>
                          <div className="font-display text-[10px] tracking-[2px] text-text-primary">
                            {card.label}
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

        {/* Loading state */}
        {isInitial && isDataLoading && (
          <div className="w-full max-w-2xl space-y-3">
            <StatBar label={siteTexts.compiling_label || 'COMPILING'} value={40} accent="yellow" delay={0} />
            <StatBar label={siteTexts.linking_label || 'LINKING'} value={70} accent="magenta" delay={200} />
            <StatBar label={siteTexts.executing_label || 'EXECUTING'} value={20} accent="cyan" delay={400} />
          </div>
        )}

        {/* Messages */}
        {!isInitial && (
          <div
            className="w-full flex-1 overflow-y-auto mb-4 pr-2"
            role="log"
            aria-live="polite"
          >
            <div className="flex flex-col gap-4 py-4">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  role={msg.role}
                  text={msg.text}
                  projects={projects}
                  skills={skills}
                  experiences={experiences}
                  responseType={msg.responseType}
                  responseData={msg.responseData}
                />
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

        {/* Inline projects */}
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
                            <Code size={16} />
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

        {/* Project detail */}
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
                      <Briefcase size={16} />
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
                  onClick={() => { setShowProjectDetail(false); setDetailProject(null); }}
                  className="text-text-muted hover:text-text-primary text-lg"
                  aria-label="Close project"
                >
                  ×
                </button>
              </div>
            </HudPanel>
          </div>
        )}

        {/* Main input bar */}
        <div className="w-full relative z-30 mt-8 mb-4">
          <Ripple className="clip-notch-md w-full" color="rgba(255,170,0,0.4)">
            <HudPanel
              accent="yellow"
              notch="md"
              className="p-1.5 flex items-center gap-2 cursor-text hud-glow-yellow w-full min-h-[60px]"
              innerClassName="w-full"
              onClick={() => setShowOverlay(true)}
            >
              <span className="font-display text-neon-yellow text-shadow-neon-yellow pl-3 text-lg flex-shrink-0">
                &gt;
              </span>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  className="w-full bg-transparent border-none text-text-primary px-2 py-2.5 focus:outline-none placeholder-text-muted text-sm font-body cursor-text focus:shadow-[0_0_12px_var(--glow-yellow)] transition-all duration-200"
                  placeholder="Ask about my development work..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setShowOverlay(true)}
                  readOnly
                  aria-label="Open chat"
                />
              </div>
              {!isInitial && (
                <NeonButton
                  variant="ghost"
                  accent="cyan"
                  iconLeft={<FiRotateCcw />}
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                >
                  CLEAR
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
        onSend={(text, skillFilter) => {
          handleSend(text, skillFilter);
          setShowOverlay(false);
        }}
        isLoading={isLoading}
        suggestions={SUGGESTIONS}
        onSuggestionClick={(label) => {
          handleSend(label);
          setShowOverlay(false);
        }}
        projects={projects}
        skills={skills}
        conversationHistory={conversationHistory}
        useEnhancedSuggestions={true}
      />
    </div>
  );
}
