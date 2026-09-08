// src/components/home/HudChrome.tsx
// Fixed HUD overlays: identity badge, status/clock, last command, system info.
import React from 'react';

type HudChromeProps = {
  profileName: string;
  profileInitial: string;
  siteTexts: Record<string, string>;
  now: string;
  messages: { text: string }[];
};

export default function HudChrome({
  profileName,
  profileInitial,
  siteTexts,
  now,
  messages,
}: HudChromeProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* Top-left: identity */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div
          className="inline-flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)] border"
          style={{
            background: 'var(--bg-2)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm font-medium"
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
          className="px-3 py-1.5 rounded-[var(--radius-md)] border inline-flex items-center gap-2"
          style={{
            background: 'var(--bg-2)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
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

      {/* Bottom-left: latest transmission */}
      {messages.length > 0 && (
        <div className="absolute bottom-28 left-4 max-w-[260px] pointer-events-auto">
          <div
            className="p-3 rounded-[var(--radius-lg)] border"
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="text-[9px] font-mono tracking-[0.24em] mb-1"
              style={{ color: 'var(--fg-4)' }}
            >
              {'\u25BC ' + (siteTexts.last_command_label || 'LAST COMMAND')}
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
      <div className="absolute bottom-28 right-4 pointer-events-auto">
        <div
          className="p-3 text-right rounded-[var(--radius-lg)] border"
          style={{
            background: 'var(--bg-2)',
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
