// src/components/home/HudChrome.tsx
// Fixed HUD overlays: identity badge, status/clock, last command, system info.
// Identity badge is context-aware: hides when hero is visible and no messages (dedup hero name).

import React, { useEffect, useState } from 'react';

type HudChromeProps = {
  profileName: string;
  profileInitial: string;
  siteTexts: Record<string, string>;
  now: string;
  messages: { text: string }[];
  heroRef?: React.RefObject<HTMLElement | null>;
};

export default function HudChrome({
  profileName,
  profileInitial,
  siteTexts,
  now,
  messages,
  heroRef,
}: HudChromeProps) {
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    if (!heroRef?.current) return;
    const el = heroRef.current;
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '-56px 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [heroRef]);

  const hasMessages = messages.length > 0;
  const showIdentity = hasMessages || !heroVisible;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* Top-left: identity — hidden when hero visible and no messages to avoid dup */}
      <div
        className={`absolute top-4 left-4 pointer-events-auto transition-all duration-300 ${
          showIdentity
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        aria-hidden={!showIdentity}
      >
        <div
          className="inline-flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)] border backdrop-blur-sm"
          style={{
            background: 'var(--surface-overlay)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm font-medium shrink-0"
            style={{ background: 'var(--fg-1)', color: 'var(--bg-1)' }}
          >
            {profileInitial}
          </div>
          <div>
            <div
              className="text-[9px] font-mono tracking-[0.28em]"
              style={{ color: 'var(--fg-4)' }}
            >
              {'// ' + (siteTexts.developer_label || 'DEVELOPER')}
            </div>
            <div
              className="text-sm font-display tracking-wide"
              style={{ color: 'var(--fg-1)' }}
            >
              {profileName}
            </div>
          </div>
        </div>
      </div>

      {/* Top-right: status + clock */}
      <div className="absolute top-4 right-4 pointer-events-auto flex flex-col items-end gap-2">
        <div
          className="px-3 py-1.5 rounded-[var(--radius-md)] border inline-flex items-center gap-2 backdrop-blur-sm"
          style={{
            background: 'var(--surface-overlay)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ background: 'var(--status-success)' }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.18em]"
            style={{ color: 'var(--fg-2)' }}
          >
            {siteTexts.active_label || 'ACTIVE'}
          </span>
        </div>
        <div className="text-[10px] font-mono" style={{ color: 'var(--fg-4)' }}>
          {now}
        </div>
      </div>

      {/* Bottom-left: latest transmission — only when has messages */}
      {hasMessages && (
        <div className="absolute bottom-24 left-4 max-w-[260px] pointer-events-auto hidden md:block">
          <div
            className="p-3 rounded-[var(--radius-lg)] border backdrop-blur-sm"
            style={{
              background: 'var(--surface-overlay)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="text-[9px] font-mono tracking-[0.24em] mb-1"
              style={{ color: 'var(--fg-4)' }}
            >
              {'▼ ' + (siteTexts.last_command_label || 'LAST COMMAND')}
            </div>
            <div
              className="text-[11px] font-body line-clamp-2"
              style={{ color: 'var(--fg-2)' }}
            >
              {messages[messages.length - 1]?.text}
            </div>
          </div>
        </div>
      )}

      {/* Bottom-right: system */}
      <div className="absolute bottom-24 right-4 pointer-events-auto hidden md:block">
        <div
          className="p-3 text-right rounded-[var(--radius-lg)] border backdrop-blur-sm"
          style={{
            background: 'var(--surface-overlay)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="text-[9px] font-mono tracking-[0.24em]"
            style={{ color: 'var(--fg-4)' }}
          >
            {siteTexts.terminal_version || 'TERMINAL v4.0.0'}
          </div>
          <div
            className="text-[9px] font-mono mt-0.5"
            style={{ color: 'var(--fg-4)' }}
          >
            {siteTexts.status_ready || 'STATUS: READY'}
          </div>
        </div>
      </div>
    </div>
  );
}
