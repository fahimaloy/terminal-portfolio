// src/components/ProjectDetailDrawer.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   PROJECT DETAIL DRAWER — right drawer replacing the centered modal for
   chat project mentions. Spring(gentle) x [100%,0] entrance, ESC + backdrop
   close, Bracket chrome (data-graphic), token-only styling.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ExternalLink, Code } from 'lucide-react';
import { animate, spring } from 'animejs';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import RichTextRenderer from './RichTextRenderer';
import Bracket from './ui/graphics/primitives/Bracket';
import { useMotionScope } from '../hooks/useMotionScope';
import { isReducedMotion, springs, durations } from '../config/animations';

type ProjectDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
};

export default function ProjectDetailDrawer({
  isOpen,
  onClose,
  projects,
  skills,
}: ProjectDetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const motionScope = useMotionScope(panelRef);
  const project = projects[0] ?? null;

  useEffect(() => {
    if (!isOpen || !panelRef.current || !backdropRef.current) return;
    if (isReducedMotion()) {
      setIsVisible(true);
      return;
    }
    const scope = motionScope.create();
    if (!scope) {
      setIsVisible(true);
      return;
    }
    scope.add(() => {
      animate(backdropRef.current!, {
        opacity: [0, 1],
        duration: durations.enter * 1000 * 0.6,
        ease: 'outExpo',
      });
      animate(panelRef.current!, {
        opacity: [0, 1],
        x: ['100%', '0%'],
        ...spring(springs.gentle),
      });
      setIsVisible(true);
    });
    return () => {
      motionScope.revert();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleClose = useCallback(() => {
    if (!panelRef.current || !backdropRef.current || isReducedMotion()) {
      onClose();
      return;
    }
    animate(backdropRef.current, {
      opacity: [1, 0],
      duration: durations.exit * 1000 * 0.6,
      ease: 'inExpo',
    });
    animate(panelRef.current, {
      opacity: [1, 0],
      x: ['0%', '100%'],
      duration: durations.exit * 1000,
      ease: 'inExpo',
      onComplete: onClose,
    });
  }, [onClose]);

  if (!isOpen || !project) return null;

  const projectSkills = skills.filter((s) => project.tags?.includes(s.name));

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0"
        onClick={handleClose}
        style={{
          background: 'var(--overlay-void-75)',
          opacity: isReducedMotion() ? 1 : 0,
        }}
      />
      <div
        ref={panelRef}
        className="absolute top-0 right-0 h-[100dvh] w-full sm:w-[420px] overflow-y-auto border-l"
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--border-subtle)',
          opacity: isReducedMotion() || isVisible ? undefined : 0,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <Bracket
            accent="cyan"
            className="absolute inset-2 opacity-60"
            strokeWidth={1}
          />
        </div>
        <div className="relative p-5 space-y-4">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border"
            style={{
              background: 'var(--bg-3)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-2)',
            }}
            aria-label="Close project details"
          >
            <X size={16} />
          </button>
          {project.thumbnail_url && (
            <div
              className="w-full aspect-video rounded-[var(--radius-lg)] overflow-hidden border"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-3)',
              }}
            >
              <Image
                src={project.thumbnail_url}
                alt={project.title}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3
            className="font-display text-lg leading-snug pr-10"
            style={{ color: 'var(--fg-1)' }}
          >
            {project.title}
          </h3>
          {projectSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {projectSkills.map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: 'var(--wash-cyan)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-2)',
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
          <div
            className="text-sm leading-relaxed"
            style={{ color: 'var(--fg-2)' }}
          >
            {project.description_html ? (
              <RichTextRenderer html={project.description_html} />
            ) : (
              project.description
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {(project.languages ?? [])
              .slice(0, 6)
              .map((l: string, i: number) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
                  style={{
                    background: 'var(--bg-3)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-3)',
                  }}
                >
                  {l}
                </span>
              ))}
          </div>
          <div className="flex gap-4">
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs hover:underline"
                style={{ color: 'var(--neon-yellow)' }}
              >
                <ExternalLink size={12} /> Live Demo
              </a>
            )}
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs hover:underline"
                style={{ color: 'var(--neon-yellow)' }}
              >
                <Code size={12} /> Repository
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
