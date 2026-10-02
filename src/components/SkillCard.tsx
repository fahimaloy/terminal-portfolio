// src/components/SkillCard.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SKILL CARD — Token-washed HUD card with brand icon
   - HudPanel wash+grid, accent cycles per id (matches InlineProjectCard)
   - Brand icon via resolveTechIcon(icon_key ?? name), 14-20px + hex wash
   - Level bar is static width — entrance motion owned by parent (SkillGrid
     stagger), so no per-card scope/timers here
   - inline: compact chip row (icon + name), no nested panel, no bar
   Token-only styling; brand hex arrives at runtime via hit.hex (no literal).
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { PortfolioSkill } from '../utils/api';
import { Tilt3D, HudPanel } from './ui';
import { resolveTechIcon } from '../lib/techIcons';

const ACCENTS = ['cyan', 'coral', 'amber', 'lime', 'violet', 'ice'] as const;

type CardAccent = (typeof ACCENTS)[number];

function accentFor(id: number): CardAccent {
  return ACCENTS[Math.abs(id) % ACCENTS.length];
}

type SkillCardProps = {
  skill: PortfolioSkill;
  inline?: boolean;
};

export default function SkillCard({ skill, inline = false }: SkillCardProps) {
  const accent = accentFor(skill.id);
  const levelValue = skill.level ? parseInt(skill.level) || 70 : 70;
  const hit = useMemo(() => {
    try {
      return resolveTechIcon(skill.icon_key || skill.name);
    } catch {
      return null;
    }
  }, [skill.icon_key, skill.name]);
  const Icon = hit?.Component ?? null;

  if (inline) {
    return (
      <div
        className="px-3 py-2 inline-flex items-center gap-2 rounded-[var(--radius-lg)] border"
        style={{
          background: `var(--wash-${accent})`,
          borderColor: 'var(--border-subtle)',
          color: 'var(--fg-1)',
        }}
      >
        {Icon && hit && <Icon size={14} color={hit.hex} aria-hidden="true" />}
        <span className="font-display text-sm">{skill.name}</span>
      </div>
    );
  }

  return (
    <Tilt3D intensity={4}>
      <HudPanel
        accent={accent}
        wash
        grid
        innerClassName="p-4 flex flex-col items-center text-center"
        // `enter={false}` — this card's entrance is owned by the parent.
        // `SkillGrid` wraps each card in `.skill-grid-item` (SkillGrid.tsx:57)
        // and staggers those wrappers with `opacity:[0,1], y:[20,0],
        // scale:[0.9,1]` (SkillGrid.tsx:31-40). This panel is inside that
        // wrapper (via `Tilt3D` at :59), so its own fade would multiply with
        // the stagger's and the two compound into a mush. The file header
        // already states the rule: "entrance motion owned by parent
        // (SkillGrid stagger), so no per-card scope/timers here".
        enter={false}
      >
        {Icon && hit && <Icon size={20} color={hit.hex} aria-hidden="true" />}
        <div
          className="font-display text-lg mt-2"
          style={{ color: `var(--neon-${accent})` }}
        >
          {skill.name}
        </div>
        <div className="w-full mt-2">
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${levelValue}%`,
                background: `var(--neon-${accent})`,
                boxShadow: `0 0 10px var(--glow-${accent})`,
              }}
            />
          </div>
        </div>
        {skill.duration && (
          <div className="text-[10px] font-mono text-neon-amber bg-neon-amber/10 border border-neon-amber/20 px-2 py-0.5 rounded-full mt-2">
            {skill.duration}
          </div>
        )}
        {skill.category && (
          <div className="text-[9px] text-text-muted mt-1">
            {skill.category}
          </div>
        )}
      </HudPanel>
    </Tilt3D>
  );
}
