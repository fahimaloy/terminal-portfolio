// src/components/Homepage.tsx
/* HOMEPAGE — orchestrator (lean after Phase 5 split). Delegates hero/stream,
// strip, and overlay to extracted components. Data + chat state stay here. */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
import ScrollIndicator from './HUD/ScrollIndicator';
import { HudChrome } from './home';
import HeroChat from './home/HeroChat';
import { ProjectStrip, ProjectInlineDetail } from './home/ProjectStrip';
import ChatModalHost from './home/ChatModalHost';
import { StatBar } from './ui';

type Message = {
  role: 'user' | 'model';
  text: string;
  responseType?: string;
  responseData?: unknown;
};

export default function Homepage() {
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
  const [detailProject, setDetailProject] = useState<PortfolioProject | null>(
    null,
  );
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [now, setNow] = useState('');

  // Data
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
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSend = async (text: string, skillFilter?: number[]) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    setConversationHistory((prev) => [...prev, text].slice(-10));
    const userMessage: Message = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const res = await axios.post('/api/chat', {
        messages: [...messages, userMessage],
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

      <div
        className={`relative z-10 flex-1 flex flex-col items-center px-4 w-full max-w-4xl mx-auto transition-all duration-500 ${
          isInitial && !isDataLoading
            ? 'justify-center pb-[18vh] pt-[10vh]'
            : 'justify-end pb-6 pt-[10vh]'
        }`}
      >
        {/* Loading skeleton stat bars */}
        {isInitial && isDataLoading && (
          <div className="w-full max-w-2xl space-y-3 mt-8">
            <StatBar
              label={siteTexts.compiling_label || 'COMPILING'}
              value={40}
              accent="yellow"
              delay={0}
            />
            <StatBar
              label={siteTexts.linking_label || 'LINKING'}
              value={70}
              accent="magenta"
              delay={200}
            />
            <StatBar
              label={siteTexts.executing_label || 'EXECUTING'}
              value={20}
              accent="cyan"
              delay={400}
            />
          </div>
        )}

        <HeroChat
          profile={profile}
          projects={projects}
          skills={skills}
          experiences={experiences}
          siteTexts={siteTexts}
          messages={messages}
          isLoading={isLoading}
          isDataLoading={isDataLoading}
          isInitial={isInitial}
          onSend={handleSend}
          onOpenChat={() => setShowOverlay(true)}
        />

        {!isInitial && projects.length > 0 && (
          <ProjectStrip
            projects={projects}
            onSelect={(p) => {
              setDetailProject(p);
              setShowProjectDetail(true);
            }}
          />
        )}

        <ProjectInlineDetail
          project={detailProject}
          open={showProjectDetail && !!detailProject}
          onClose={() => {
            setShowProjectDetail(false);
            setDetailProject(null);
          }}
        />

        <ChatModalHost
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onReset={handleReset}
          showClear={!isInitial}
          showOverlay={showOverlay}
          setShowOverlay={setShowOverlay}
          isLoading={isLoading}
          projects={projects}
          skills={skills}
          conversationHistory={conversationHistory}
        />
      </div>
    </div>
  );
}
