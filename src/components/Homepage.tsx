// src/components/Homepage.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   HOMEPAGE — Enhanced with Anime.js v4 animations
   Sections extracted into home/HudChrome, home/HeroSection, home/ChatInputBar.
══════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  Briefcase,
  Code,
  User,
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
import { HudPanel, StatBar, Ripple } from './ui';
import { HudChrome, HeroSection, ChatInputBar } from './home';
import { isReducedMotion } from '../config/animations';

type Message = {
  role: 'user' | 'model';
  text: string;
  responseType?: string;
  responseData?: unknown;
};

const SUGGESTIONS = [
  { label: 'What are your core skills?', icon: <Code size={16} />, match: ['skills', 'tech'] },
  { label: 'Tell me about your recent projects.', icon: <Briefcase size={16} />, match: ['projects', 'work'] },
  { label: 'Where can I find your GitHub?', icon: <Code size={16} />, match: ['github', 'code'] },
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  // Animated stats
  const projectCount = useCounter(projects.length, 1500, 800);
  const skillCount = useCounter(skills.length, 1500, 1000);
  const expCount = useCounter(experiences.length, 1500, 1200);

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

      const label = heroRef.current!.querySelector('[data-hero="label"]');
      if (label) tl.add(label, { opacity: [0, 1], y: [8, 0], duration: 400 }, 0);

      const name = heroRef.current!.querySelector('[data-hero="name"]');
      if (name) tl.add(name, { opacity: [0, 1], y: [20, 0], scale: [0.95, 1], ...spring({ stiffness: 100, damping: 12 }) }, 200);

      const title = heroRef.current!.querySelector('[data-hero="title"]');
      if (title) tl.add(title, { opacity: [0, 1], y: [10, 0], duration: 400 }, 600);

      const bio = heroRef.current!.querySelector('[data-hero="bio"]');
      if (bio) tl.add(bio, { opacity: [0, 1], y: [10, 0], duration: 400 }, 800);

      const stats = heroRef.current!.querySelector('[data-hero="stats"]');
      if (stats) tl.add(stats, { opacity: [0, 1], y: [10, 0], duration: 400 }, 900);

      const btns = heroRef.current!.querySelectorAll('[data-hero="cta"]');
      if (btns) tl.add(btns, { opacity: [0, 1], y: [12, 0], duration: 350, delay: stagger(80) }, 1000);

      const cards = heroRef.current!.querySelectorAll('[data-hero="card"]');
      if (cards) tl.add(cards, { opacity: [0, 1], y: [24, 0], scale: [0.92, 1], delay: stagger(60, { from: 'first' }), ...spring({ stiffness: 150, damping: 14 }) }, 1200);

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

      <ScrollIndicator />

      <HudChrome
        profileName={profile?.full_name?.split(' ')[0] || 'Fahim'}
        profileInitial={(profile?.full_name || 'FA').charAt(0)}
        siteTexts={siteTexts}
        now={now}
        messages={messages}
      />

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
          <HeroSection
            ref={heroRef}
            profile={profile}
            projects={projects}
            skills={skills}
            experiences={experiences}
            siteTexts={siteTexts}
            projectCount={projectCount}
            skillCount={skillCount}
            expCount={expCount}
            onSend={handleSend}
            onOpenChat={() => setShowOverlay(true)}
          />
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
          <div className="w-full flex-1 overflow-y-auto mb-4 pr-2" role="log" aria-live="polite">
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
                    onClick={() => { setDetailProject(project); setShowProjectDetail(true); }}
                    className="w-[150px] cursor-pointer"
                  >
                    <HudPanel accent={accent} notch="sm" className="p-2 hud-glow-yellow">
                      <div className="w-full h-16 overflow-hidden bg-black/40 mb-2">
                        {project.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" loading="lazy" />
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
                      <span key={i} className="text-[9px] font-display tracking-[1px] px-1.5 py-0.5 bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setShowProjectDetail(false); setDetailProject(null); }} className="text-text-muted hover:text-text-primary text-lg" aria-label="Close project">
                  ×
                </button>
              </div>
            </HudPanel>
          </div>
        )}

        {/* Chat input */}
        <ChatInputBar
          input={input}
          onInputChange={setInput}
          onSend={() => handleSend(input)}
          onOpen={() => setShowOverlay(true)}
          onReset={handleReset}
          showClear={!isInitial}
        />
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
