/* MentionChip — small wash/grid/accent chip for use in ChatMessage and other UI.
   Props: tag (string), wash (optional wash color), accent (color name),
   size ("sm" | "md" | "lg"), grid (boolean for grid-staggered layout).
   Renders a HudPanel with optional grid children when grid=true.
*/

import React from 'react';
import HudPanel from './ui/HudPanel';

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
  children?: React.ReactNode;
};

export const MentionChip = ({
  tag,
  wash,
  accent = 'cyan',
  size = 'md',
  grid = false,
  children,
}: MentionChipProps) => {
  const washStyle = wash
    ? {
        background: `var(--wash-${wash})`,
        color: 'var(--fg-1)',
      }
    : {};

  return (
    <HudPanel wash grid accent={accent as any}>
      <span
        className={`text-[9px] font-mono tracking-[0.15em] select-none ${
          grid ? 'grid grid-cols-2 gap-1' : ''
        }`}
        style={{ ...washStyle }}
      >
        {tag}
      </span>
      {children !== undefined ? children : null}
    </HudPanel>
  );
};

MentionChip.displayName = 'MentionChip';
export default MentionChip;
