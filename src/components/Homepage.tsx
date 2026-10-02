// src/components/Homepage.tsx
/* HOMEPAGE — orchestrator (lean after Phase 5 split). Delegates hero/stream,
// strip, and overlay to extracted components. Data + chat state stay here. */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
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
import HudChrome from './home/HudChrome';
import HeroChat from './home/HeroChat';
import { ProjectStrip, ProjectInlineDetail } from './home/ProjectStrip';
import ChatModalHost from './home/ChatModalHost';
import { resolveName } from '../config/identity';
import type { Message } from '../types/chat';

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

  // Data
  //
  // Every branch is bounded. The previous version was a bare
  // `await Promise.all([...])` with no timeout and no catch, so a single
  // hanging Supabase request left `isDataLoading` true forever and the hero
  // skeleton sat on screen permanently. Each getter already resolves
  // to an empty value on failure, so an individual failure is harmless — the
  // only real risk was a request that never settles, and that is what the
  // deadline covers.
  useEffect(() => {
    let cancelled = false;
    const DEADLINE_MS = 4000;
    let deadline = 0;

    const load = async () => {
      setIsDataLoading(true);

      const timeout = new Promise<undefined>((resolve) => {
        deadline = window.setTimeout(() => resolve(undefined), DEADLINE_MS);
      });

      try {
        const result = await Promise.race([
          Promise.all([
            getPortfolioProfile(),
            getPortfolioProjects(),
            getPortfolioSkills(),
            getPortfolioExperiences(),
            getSiteTexts(),
          ]),
          timeout,
        ]);

        if (cancelled) return;

        if (result) {
          const [p, pr, sk, exp, texts] = result;
          if (p) setProfile(p);
          setProjects(pr);
          setSkills(sk);
          setExperiences(exp);
          setSiteTexts(texts);
        }
        // A timeout resolves `undefined` and is deliberately not an error: the
        // page still renders, just without CMS data, which is the correct
        // degraded state. Either way the skeleton must go.
      } catch {
        // A rejected getter must not strand the skeleton either.
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      window.clearTimeout(deadline);
    };
  }, []);

  // The HUD clock moved into HudChrome. It used to live here as `now` state,
  // so a 1s interval re-rendered the whole homepage — hero, chat stream, the
  // lot — every second, just to move three glyphs in a corner.

  const handleSend = async (text: string, skillFilter?: number[]) => {
    if (!text.trim() || isLoading) return;
    window.dispatchEvent(new CustomEvent('portfolio:chat-send'));
    setInput('');
    setConversationHistory((prev) => [...prev, text].slice(-10));
    const userMessage: Message = { role: 'user', text, ts: Date.now() };
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
          ts: Date.now(),
        },
      ]);
      setConversationHistory((prev) => [...prev, reply].slice(-10));
    } catch {
      // A failed request must not read like an answer. It gets `isError` so the
      // stream renders a distinct card with a retry, and it is deliberately
      // kept out of `conversationHistory` so a dead exchange is not fed back to
      // the model as prior context.
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: "I couldn't reach the server. Your message wasn't sent — check your connection and try again.",
          isError: true,
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-runs the last thing the user asked, without re-adding the failed turn.
  const lastUserText = [...messages]
    .reverse()
    .find((m) => m.role === 'user')?.text;
  const handleRetry = useCallback(() => {
    if (lastUserText) void handleSend(lastUserText);
  }, [lastUserText]);

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setShowProjectDetail(false);
    setDetailProject(null);
  };

  const homeRootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const isInitial = messages.length === 0 && !showProjectDetail;

  // The scene layer lives in _app, one level up. This window event is how the
  // page tells it "the chat is open" without threading scene state through
  // every component in between.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('portfolio:chat-mode', {
        detail: { open: !isInitial || showOverlay },
      }),
    );
  }, [isInitial, showOverlay]);

  return (
    <div
      ref={homeRootRef}
      className="h-[100dvh] min-h-[100dvh] flex flex-col overflow-hidden relative"
    >
      {/* `relative` with no `z-index`, deliberately. A z-index here would make
          this root a stacking context, and that context would trap the chat
          sheet (`z-40` backdrop, `z-50` sheet) and the project drawer (`z-50`)
          inside a band that a fixed HUD instrument mounted by the shell cannot
          out-rank from outside — the accent strip would float over an open
          dialog, fully lit, instead of being dimmed by it. `AdminLayout`'s
          root is static for exactly the same reason, and the two then behave
          identically. Nothing in this tree blends with what is behind it or
          relies on the root to contain stacking, so the only thing that
          changes is which of the two wins: now the dialog does. */}
      {/* Background/scene is owned by the app shell (see _app.tsx SceneLayer) so
          exactly one instance exists per route. Mounting a second one here
          doubled the particle field, grid, scanlines and aurora. */}
      <SEOMeta
        title={resolveName(profile)}
        description={
          profile?.bio ||
          'Full-Stack Web & App Developer | Building digital solutions with modern technologies'
        }
        image={profile?.avatar_url ?? undefined}
        path="/"
      />
      <ScrollIndicator />
      <HudChrome
        profileName={resolveName(profile).split(/\s+/)[0]}
        profileInitial={resolveName(profile).charAt(0).toUpperCase()}
        siteTexts={siteTexts}
        messages={messages}
        heroRef={heroRef}
      />

      {/* Scrollable middle. `my-auto` rather than `justify-center`: centering a
          flex child that is taller than its container clips BOTH ends, which
          cut the quick-command row off the bottom of a 100dvh viewport. */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center"
        style={{
          paddingTop: 'calc(var(--header-h) + 12px)',
          paddingBottom: 8,
        }}
      >
        <div className="w-full max-w-4xl mx-auto px-4 flex flex-col items-center my-auto py-6">
          {/* The loading affordance for this slot is HeroChat's, and only
              HeroChat's. This block used to render three neon StatBars above
              it under the same `isInitial && isDataLoading` predicate — two
              visual languages stacked in one frame, reading as two
              applications. Worse, those bars animated toward hardcoded values
              (40/70/20): a progress readout displaying invented numbers. The
              real counts (projects, skills, experience) are rendered by
              HeroChat's counters as soon as the data lands, so deleting the
              block loses nothing and the fabricated readout is gone. */}
          <div ref={heroRef} className="w-full">
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
              onRetry={handleRetry}
            />
          </div>

          {!isInitial && projects.length > 0 && (
            <div className="w-full mt-6">
              <ProjectStrip
                projects={projects}
                onSelect={(p) => {
                  setDetailProject(p);
                  setShowProjectDetail(true);
                }}
              />
            </div>
          )}

          <ProjectInlineDetail
            project={detailProject}
            open={showProjectDetail && !!detailProject}
            onClose={() => {
              setShowProjectDetail(false);
              setDetailProject(null);
            }}
          />
        </div>
      </div>

      {/* Sticky input — always inside dvh, never offscreen. This footer's
          paddings are the primitives behind `--composer-clearance` (with
          `ChatInputBar`'s own `--composer-bar-min`/`--composer-gap`/
          `--composer-inset`), which is what the accent strip and the
          last-command caption offset themselves by — so change a padding here
          and all three move together. */}
      <div
        className="shrink-0 w-full max-w-4xl mx-auto px-4"
        style={{
          paddingBottom: 'var(--composer-safe)',
          paddingTop: 8,
          background: 'linear-gradient(to top, var(--bg-1) 78%, transparent)',
        }}
      >
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
