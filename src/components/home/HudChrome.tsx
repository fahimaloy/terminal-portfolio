// src/components/home/HudChrome.tsx
// Fixed HUD overlays: identity badge, status/clock, last command, system info.
import React from 'react';
import { HudPanel } from '../ui';

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
      {/* Top-left: ROOT.USER */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <HudPanel
          accent="yellow"
          notch="md"
          className="p-3 inline-flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-yellow to-neon-magenta flex items-center justify-center font-display text-black text-sm shadow-[0_0_12px_var(--glow-yellow)]">
            {profileInitial}
          </div>
          <div>
            <div className="text-[9px] font-display tracking-[3px] text-neon-yellow text-shadow-neon-yellow">
              {'// ' + (siteTexts.developer_label || 'DEVELOPER')}
            </div>
            <div className="text-sm font-display tracking-wider text-text-primary">
              {profileName}
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
  );
}
