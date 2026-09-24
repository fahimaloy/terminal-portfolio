import React, { useEffect, useState } from 'react';
import { MagneticButton } from '../../components/ui';
import { RiGithubLine, RiFileTextLine } from 'react-icons/ri';

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

      {/* Top-right: icon buttons + status + clock */}
      <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-3">
        {/* Source Code & Blog icon buttons */}
        <div className="flex items-center gap-1.5">
          <MagneticButton
            as="a"
            href="https://github.com/fahimaloy"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source Code on GitHub"
            className="p-2 rounded-[var(--radius-md)] transition-colors duration-200"
            style={{
              background: 'transparent',
              color: 'var(--fg-2)',
              borderColor: 'transparent',
            }}
          >
            <RiGithubLine size={16} />
          </MagneticButton>
          <MagneticButton
            as="a"
            href="/blog"
            aria-label="Blog"
            className="p-2 rounded-[var(--radius-md)] transition-colors duration-200"
            style={{
              background: 'transparent',
              color: 'var(--fg-2)',
              borderColor: 'transparent',
            }}
          >
            <RiFileTextLine size={16} />
          </MagneticButton>
        </div>
        {/* Status + clock */}
        <div className="flex flex-col items-end gap-2 ml-3 border-l border-[var(--border-subtle)] pl-3">
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
          <div
            className="text-[10px] font-mono"
            style={{ color: 'var(--fg-4)' }}
          >
            {now}
          </div>
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
    </div>
  );
}
