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

const ACCENT_TEXT: Record<Feature['accent'], string> = {
  coral: 'text-neon-coral text-shadow-neon-coral',
  cyan: 'text-neon-cyan text-shadow-neon-cyan',
  lime: 'text-neon-lime text-shadow-neon-lime',
};
const ACCENT_BG: Record<Feature['accent'], string> = {
  coral: 'bg-neon-coral/10 border-neon-coral/40',
  cyan: 'bg-neon-cyan/10 border-neon-cyan/40',
  lime: 'bg-neon-lime/10 border-neon-lime/40',
};
const ACCENT_GLOW: Record<Feature['accent'], string> = {
  coral: 'hud-glow-coral',
  cyan: 'hud-glow-cyan',
  lime: 'hud-glow-lime',
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
            onClick={() => onModeChange(isActive ? 'chat' : f.mode)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-display tracking-[2px] uppercase border transition-all duration-200 clip-notch-sm
              ${
                isActive
                  ? `${ACCENT_BG[f.accent]} ${ACCENT_TEXT[f.accent]} ${
                      ACCENT_GLOW[f.accent]
                    }`
                  : 'bg-transparent border-white/10 text-text-secondary hover:border-white/30 hover:text-text-primary'
              }
            `}
          >
            {f.icon}
            <span>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
