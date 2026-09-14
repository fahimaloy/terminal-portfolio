/* MentionChip — uniform mention base for ChatMessage and other UI.
   Props: tag (string), wash (wash color), accent, size, grid,
   leading (icon/cover node), chevron (show > affordance),
   onClick (makes it role=button + keyboard operable + spring press).
   Renders a HudPanel wash+grid. Token-only; no raw hex.
*/

import React, { useRef } from 'react';
import { animate, spring } from 'animejs';
import { ChevronRight } from 'lucide-react';
import HudPanel from './ui/HudPanel';
import { springs, isReducedMotion, canAnimate } from '../config/animations';

type WashColor =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'red'
  | 'purple'
  | 'blue';

type MentionChipProps = {
  tag: string;
  wash?: WashColor;
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
  grid?: boolean;
  leading?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  role?: string;
  children?: React.ReactNode;
};

export const MentionChip = ({
  tag,
  wash,
  accent = 'cyan',
  size = 'md',
  grid = false,
  leading,
  chevron = false,
  onClick,
  role,
  children,
}: MentionChipProps) => {
  const pressRef = useRef<HTMLDivElement>(null);
  const clickable = typeof onClick === 'function';

  const press = () => {
    const el = pressRef.current;
    if (!el || isReducedMotion() || !canAnimate()) return;
    animate(el, {
      scale: [0.98, 1],
      ...spring(springs.card),
    });
  };

  const washStyle = wash
    ? {
        background: `var(--wash-${wash})`,
        color: 'var(--fg-1)',
      }
    : {};

  const inner = (
    <HudPanel wash grid accent={accent as 'cyan'} className="px-3 py-2">
      <span
        className={`flex items-center gap-2 ${
          grid ? 'grid grid-cols-2 gap-1' : ''
        }`}
        style={{ ...washStyle }}
      >
        {leading ?? null}
        <span
          className={`font-mono tracking-[0.15em] select-none ${
            size === 'sm'
              ? 'text-[8px]'
              : size === 'lg'
              ? 'text-[11px]'
              : 'text-[9px]'
          }`}
        >
          {tag}
        </span>
        {(chevron || clickable) && (
          <ChevronRight size={14} aria-hidden="true" className="shrink-0" />
        )}
      </span>
      {children !== undefined ? children : null}
    </HudPanel>
  );

  if (!clickable) return inner;

  return (
    <div
      ref={pressRef}
      role={role ?? 'button'}
      tabIndex={0}
      aria-label={tag}
      className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] rounded-[var(--radius-lg)]"
      onClick={() => {
        press();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          press();
          onClick?.();
        }
      }}
    >
      {inner}
    </div>
  );
};

MentionChip.displayName = 'MentionChip';
export default MentionChip;
