// src/components/AdvancedFeaturesBar.tsx
import React from 'react';
import { FiMail, FiCalendar, FiSearch } from 'react-icons/fi';

export type FeatureMode = 'chat' | 'contact' | 'meeting' | 'project_match';

type Feature = {
  mode: FeatureMode;
  label: string;
  icon: React.ReactNode;
  accent: 'coral' | 'cyan' | 'lime';
};

const FEATURES: Feature[] = [
  { mode: 'contact', label: 'CONTACT', icon: <FiMail />, accent: 'coral' },
  { mode: 'meeting', label: 'MEETING', icon: <FiCalendar />, accent: 'cyan' },
  {
    mode: 'project_match',
    label: 'PROJECT MATCH',
    icon: <FiSearch />,
    accent: 'lime',
  },
];

// `text-shadow-neon-*` and `hud-glow-*` are dead classes — they survived in
// this file (and ~30 other call sites) after the glow system was replaced by
// the `.accent-*` utilities in global.css. They rendered as nothing, so the
// active tab's "selected" look was carried entirely by the /10 wash. The glow
// now comes from an inline `text-shadow` against a real `--glow-x` token, and
// the dead class names are gone.
const ACCENT_TEXT: Record<Feature['accent'], string> = {
  coral: 'text-neon-coral',
  cyan: 'text-neon-cyan',
  lime: 'text-neon-lime',
};
const ACCENT_BG: Record<Feature['accent'], string> = {
  coral: 'bg-neon-coral/10 border-neon-coral/40',
  cyan: 'bg-neon-cyan/10 border-neon-cyan/40',
  lime: 'bg-neon-lime/10 border-neon-lime/40',
};
const ACCENT_GLOW: Record<Feature['accent'], string> = {
  coral: '0 0 14px var(--glow-coral-sm)',
  cyan: '0 0 14px var(--glow-cyan-sm)',
  lime: '0 0 14px var(--glow-lime-sm)',
};

type Props = {
  activeMode: FeatureMode;
  onModeChange: (mode: FeatureMode) => void;
};

export default function AdvancedFeaturesBar({
  activeMode,
  onModeChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      {FEATURES.map((f) => {
        const isActive = activeMode === f.mode;
        return (
          <button
            key={f.mode}
            type="button"
            onClick={() => onModeChange(isActive ? 'chat' : f.mode)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-2 px-3 py-2 min-h-[44px] min-w-[44px] text-[10px] font-display tracking-[2px] uppercase border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]
              ${
                isActive
                  ? `${ACCENT_BG[f.accent]} ${ACCENT_TEXT[f.accent]}`
                  : 'bg-transparent border-[var(--border-subtle)] text-text-secondary hover:border-[var(--border-strong)] hover:text-text-primary'
              }
            `}
            style={isActive ? { textShadow: ACCENT_GLOW[f.accent] } : undefined}
          >
            <span aria-hidden="true">{f.icon}</span>
            <span>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
