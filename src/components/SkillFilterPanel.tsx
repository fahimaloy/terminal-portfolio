// src/components/SkillFilterPanel.tsx
import React, { useState, useMemo } from 'react';
import { PortfolioSkill } from '../utils/api';
import * as LucideIcons from 'lucide-react';
import { Search } from 'lucide-react';

type SkillFilterPanelProps = {
  skills: PortfolioSkill[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

export default function SkillFilterPanel({
  skills,
  selectedIds,
  onChange,
}: SkillFilterPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return skills;
    return skills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [skills, search]);

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div className="p-3 border-t border-white/5 bg-black/20">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-gray-400" />
        <input
          type="text"
          placeholder="Filter by skill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-500"
        />
        {selectedIds.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((skill) => {
          const Icon = skill.icon_key
            ? (LucideIcons[skill.icon_key] as React.ComponentType<any>)
            : null;
          const isSelected = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => toggle(skill.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                isSelected
                  ? 'bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {Icon && <Icon size={12} />}
              {skill.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
