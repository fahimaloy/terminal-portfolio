// src/components/AdvancedFeaturesBar.tsx
import React from 'react';
import { FiMail, FiCalendar, FiSearch } from 'react-icons/fi';

export type FeatureMode = 'chat' | 'contact' | 'meeting' | 'project_match';

type Feature = {
  mode: FeatureMode;
  label: string;
  icon: React.ReactNode;
  accent: 'magenta' | 'cyan' | 'green';
};

const FEATURES: Feature[] = [
  { mode: 'contact', label: 'CONTACT', icon: <FiMail />, accent: 'magenta' },
  { mode: 'meeting', label: 'MEETING', icon: <FiCalendar />, accent: 'cyan' },
  {
    mode: 'project_match',
    label: 'PROJECT MATCH',
    icon: <FiSearch />,
    accent: 'green',
  },
];

const ACCENT_TEXT: Record<Feature['accent'], string> = {
  magenta: 'text-neon-magenta text-shadow-neon-magenta',
  cyan: 'text-neon-cyan text-shadow-neon-cyan',
  green: 'text-neon-green text-shadow-neon-green',
};
const ACCENT_BG: Record<Feature['accent'], string> = {
  magenta: 'bg-neon-magenta/10 border-neon-magenta/40',
  cyan: 'bg-neon-cyan/10 border-neon-cyan/40',
  green: 'bg-neon-green/10 border-neon-green/40',
};
const ACCENT_GLOW: Record<Feature['accent'], string> = {
  magenta: 'hud-glow-magenta',
  cyan: 'hud-glow-cyan',
  green: 'hud-glow-green',
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
