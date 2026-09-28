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
    return skills.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [skills, search]);

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div className="p-3 border-t border-[var(--overlay-white-05)] bg-[var(--overlay-black-20)]">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-[var(--fg-3)]" />
        <input
          type="text"
          placeholder="Filter by skill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-h-[44px] min-w-[44px] bg-transparent text-sm text-[var(--fg-1)] focus:outline-none placeholder-[var(--fg-3)]"
        />
        {selectedIds.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="min-h-[44px] min-w-[44px] px-2 -mr-2 text-xs text-[var(--fg-3)] hover:text-[var(--fg-1)]"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((skill) => {
          const Icon = skill.icon_key
            ? (LucideIcons[skill.icon_key as keyof typeof LucideIcons] as
                React.ComponentType<any> | undefined)
            : null;
          const isSelected = selectedIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => toggle(skill.id)}
              className={`inline-flex items-center gap-1 min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs transition-all ${
                isSelected
                  ? 'bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan'
                  : 'bg-[var(--overlay-white-05)] border-[var(--overlay-white-10)] text-[var(--fg-3)] hover:bg-[var(--overlay-white-10)]'
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
