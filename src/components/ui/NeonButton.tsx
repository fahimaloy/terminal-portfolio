// src/components/ui/NeonButton.tsx
// Premium button component with multiple variants, ripple effects, and micro-interactions
import React, { useRef, useEffect, useState } from 'react';
import { animate, createScope, stagger, spring } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';

type Variant = 'filled' | 'outline' | 'ghost' | 'glass' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

// Updated accent map to match new tokens.css (neon-cyan, neon-magenta, neon-amber, neon-violet, neon-rose, neon-lime, neon-ice, neon-cyan-alt, neon-cyan-teal)
// Also includes legacy accents for backward compatibility
type NeonAccent =
  | 'cyan'
  | 'magenta'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'lime'
  | 'ice'
  | 'cyanAlt'
  | 'cyanTeal'
  // Legacy accents for backward compatibility
  | 'yellow'
  | 'green'
  | 'red'
  | 'purple'
  | 'blue';

const ACCENT_MAP: Record<NeonAccent, string> = {
  cyan: 'var(--neon-cyan)',
  magenta: 'var(--neon-magenta)',
  amber: 'var(--neon-amber)',
  violet: 'var(--neon-violet)',
  rose: 'var(--neon-rose)',
  lime: 'var(--neon-lime)',
  ice: 'var(--neon-ice)',
  cyanAlt: 'var(--neon-cyan-alt)',
  cyanTeal: 'var(--neon-cyan-teal)',
  // Legacy accents - map to new tokens
  yellow: 'var(--neon-yellow)',
  green: 'var(--neon-green)',
  red: 'var(--neon-red)',
  purple: 'var(--neon-purple)',
  blue: 'var(--neon-blue)',
};

const GLOW_MAP: Record<NeonAccent, string> = {
  cyan: 'var(--glow-cyan)',
  magenta: 'var(--glow-magenta)',
  amber: 'var(--glow-amber)',
  violet: 'var(--glow-violet)',
  rose: 'var(--glow-rose)',
  lime: 'var(--glow-lime)',
  ice: 'var(--glow-ice)',
  cyanAlt: 'var(--glow-cyan)',
  cyanTeal: 'var(--glow-cyan)',
  yellow: 'var(--glow-yellow)',
  green: 'var(--glow-green)',
  red: 'var(--glow-red)',
  purple: 'var(--glow-purple)',
  blue: 'var(--glow-blue)',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  accent?: NeonAccent;
  loading?: boolean;
  size?: Size;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  ripple?: boolean;
  fullWidth?: boolean;
};

export default function NeonButton({
  variant = 'filled',
  accent = 'cyan',
  loading = false,
  size = 'md',
  ripple = true,
  fullWidth = false,
  iconLeft,
  iconRight,
  className = '',
  children,
  disabled,
  style,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const accentColor = ACCENT_MAP[accent];
  const accentGlow = GLOW_MAP[accent];
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const reduced = isReducedMotion();
  const animateEnabled = canAnimate();

  // Initialize animation scope
  useEffect(() => {
    if (reduced || !animateEnabled || typeof window === 'undefined') return;
    const scope = createScope({ root: buttonRef.current as HTMLElement });
    scopeRef.current = scope;
    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [reduced, animateEnabled]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    setPressed(true);
    if (ripple && animateEnabled && !reduced) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setRipplePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
    onMouseDown?.(e);
    // Press animation
    if (!reduced && animateEnabled) {
      const easing = spring(springs.hard);
      animate(buttonRef.current!, {
        scale: 0.96,
        duration: durations.tap * 1000,
        ease: easing,
        composition: 'blend',
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    setPressed(false);
    setRipplePos(null);
    onMouseUp?.(e);
    // Release animation
    if (!reduced && animateEnabled) {
      const easing = spring(springs.bouncy);
      animate(buttonRef.current!, {
        scale: 1,
        duration: durations.tap * 1000 * 1.2,
        ease: easing,
        composition: 'blend',
      });
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    setPressed(false);
    setRipplePos(null);
    setHovered(false);
    onMouseLeave?.(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    setHovered(true);
    if (!reduced && animateEnabled) {
      const easing = spring(springs.soft);
      const smoothEase = easings.smooth ?? 'linear';
      animate(buttonRef.current!, {
        boxShadow:
          variant === 'filled'
            ? `0 0 0 1px ${accentColor}, 0 0 20px ${accentGlow}`
            : `0 0 0 1px var(--border-strong), 0 0 16px var(--glow-cyan-sm)`,
        duration: durations.hover * 1000,
        ease: easing ?? smoothEase,
      });
    }
  };

  const handleMouseLeaveBlur = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    setHovered(false);
    if (!reduced && animateEnabled) {
      animate(buttonRef.current!, {
        boxShadow: variant === 'filled' ? 'none' : 'none',
        duration: durations.hover * 1000,
        ease: easings.smooth,
      });
    }
  };

  const sizeStyles: Record<Size, React.CSSProperties> = {
    sm: { padding: '0.5rem 1rem', fontSize: '0.625rem', gap: '0.375rem' },
    md: { padding: '0.75rem 1.5rem', fontSize: '0.6875rem', gap: '0.5rem' },
    lg: { padding: '1rem 2rem', fontSize: '0.75rem', gap: '0.75rem' },
  };

  const variantStyles: Record<Variant, React.CSSProperties> = {
    filled: {
      background: accentColor,
      color: 'var(--bg-1)',
      border: `1px solid ${accentColor}`,
      boxShadow: `0 0 0 1px ${accentColor}, 0 4px 16px ${accentGlow}`,
    },
    outline: {
      background: 'transparent',
      color: accentColor,
      border: `1px solid ${accentColor}`,
    },
    ghost: {
      background: 'transparent',
      color: 'var(--fg-2)',
      border: '1px solid transparent',
    },
    glass: {
      background: 'var(--glass-bg)',
      color: accentColor,
      border: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
    },
    gradient: {
      background: `linear-gradient(135deg, ${ACCENT_MAP.cyan} 0%, ${ACCENT_MAP.magenta} 100%)`,
      color: 'var(--bg-1)',
      border: 'none',
    },
  };

  return (
    <button
      ref={buttonRef}
      {...rest}
      disabled={isDisabled}
      style={
        {
          ...variantStyles[variant],
          ...sizeStyles[size],
          ...style,
          borderRadius: 'var(--radius-md)',
          // token-lint-ignore -- inline transition uses CSS vars, not Tailwind classes
          transition: `transform var(--dur-hover) var(--ease-out), background var(--dur-hover) var(--ease-out), color var(--dur-hover) var(--ease-out), border-color var(--dur-hover) var(--ease-out), box-shadow var(--dur-hover) var(--ease-out), opacity var(--dur-hover) var(--ease-out)`, // token-lint-ignore
          width: fullWidth ? '100%' : 'auto',
          position: 'relative',
          overflow: 'hidden',
        } as React.CSSProperties
      }
      className={`font-display tracking-[2px] uppercase inline-flex items-center justify-center
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]
        ${fullWidth ? 'w-full' : ''}
        ${className}`}
      onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) =>
        handleMouseDown(e)
      }
      onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => handleMouseUp(e)}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
        handleMouseLeave(e)
      }
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
        handleMouseEnter(e)
      }
      onTouchStart={(e: React.TouchEvent<HTMLButtonElement>) =>
        handleMouseDown(e as unknown as React.MouseEvent<HTMLButtonElement>)
      }
      onTouchEnd={(e: React.TouchEvent<HTMLButtonElement>) =>
        handleMouseUp(e as unknown as React.MouseEvent<HTMLButtonElement>)
      }
    >
      {/* Ripple effect */}
      {ripple && ripplePos && animateEnabled && !reduced && (
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripplePos.x,
            top: ripplePos.y,
            width: '0',
            height: '0',
            // token-lint-ignore -- ripple effect uses white overlay, acceptable as inline style
            background: 'rgba(255,255,255,0.3)',
            transform: 'translate(-50%, -50%)',
            animation: `ripple-out 600ms ${easings.outExpo} forwards`,
          }}
        />
      )}

      {/* Loading spinner */}
      {loading ? (
        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}
