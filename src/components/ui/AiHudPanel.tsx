// src/components/ui/AiHudPanel.tsx
/* AI response wrapper — HudPanel with wash + grid pre-set (cyan accent, sm notch). */
import React from 'react';
import HudPanel from './HudPanel';
import type { GlitchAccent } from './GlitchText';

type AiHudPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: GlitchAccent;
};

export default function AiHudPanel({
  children,
  accent = 'cyan',
  className = '',
  ...rest
}: AiHudPanelProps) {
  return (
    <HudPanel
      accent={accent}
      notch="sm"
      wash
      grid
      className={className}
      {...rest}
    >
      {children}
    </HudPanel>
  );
}
