import React from 'react';
import { FiMail, FiCalendar, FiSearch } from 'react-icons/fi';

export type FeatureMode = 'chat' | 'contact' | 'meeting' | 'project_match';

type AdvancedFeaturesBarProps = { activeMode: FeatureMode; onModeChange: (mode: FeatureMode) => void; };

const features = [
  { mode: 'contact' as FeatureMode, label: 'Contact Me', icon: <FiMail className="w-4 h-4" />, color: 'purple' },
  { mode: 'meeting' as FeatureMode, label: 'Book Meeting', icon: <FiCalendar className="w-4 h-4" />, color: 'cyan' },
  { mode: 'project_match' as FeatureMode, label: 'Project Match', icon: <FiSearch className="w-4 h-4" />, color: 'lime' },
];

const colorMap: Record<string, { active: string; inactive: string; activeBg: string }> = {
  purple: { active: 'text-purple-200 border-purple-500/60', inactive: 'text-gray-400 border-gray-700/50 hover:text-purple-300 hover:border-purple-500/30', activeBg: 'bg-purple-500/10' },
  cyan: { active: 'text-cyan-200 border-cyan-500/60', inactive: 'text-gray-400 border-gray-700/50 hover:text-cyan-300 hover:border-cyan-500/30', activeBg: 'bg-cyan-500/10' },
  lime: { active: 'text-lime-200 border-lime-500/60', inactive: 'text-gray-400 border-gray-700/50 hover:text-lime-300 hover:border-lime-500/30', activeBg: 'bg-lime-500/10' },
};

export default function AdvancedFeaturesBar({ activeMode, onModeChange }: AdvancedFeaturesBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-2 py-2">
      {features.map((feature) => {
        const colors = colorMap[feature.color];
        const isActive = activeMode === feature.mode;
        return (
          <button
            key={feature.mode}
            onClick={() => onModeChange(isActive ? 'chat' : feature.mode)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-all duration-300 backdrop-blur-sm ${
              isActive ? `${colors.active} ${colors.activeBg} shadow-lg` : `${colors.inactive} bg-transparent`
            }`}
          >
            {feature.icon}
            <span>{feature.label}</span>
          </button>
        );
      })}
    </div>
  );
}
