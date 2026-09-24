import Head from 'next/head';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PortfolioProject } from '../../utils/api';
import { StatBar, Tilt3D } from '../ui';
import { getProjectMetric } from '../../types/project';
import { animate, createScope, onScroll, stagger } from 'animejs';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';
import { Clock, GitBranch, ExternalLink, Code } from 'lucide-react';

interface ProjectGridProps {
  projects: PortfolioProject[];
  onProjectClick: (project: PortfolioProject) => void;
}

function ProjectCard({
  project,
  index,
  onProjectClick,
  hoveredCard,
  setHoveredCard,
  reduced,
  animateEnabled,
}: {
  project: PortfolioProject;
  index: number;
  onProjectClick: (project: PortfolioProject) => void;
  hoveredCard: number | null;
  setHoveredCard: (id: number | null) => void;
  reduced: boolean;
  animateEnabled: boolean;
}) {
  const complexity = getProjectMetric(
    project,
    'complexity',
    50 + ((project.id * 7) % 40),
  );
  const isHovered = hoveredCard === project.id;

  const cardContent = (
    <div
      onClick={() => onProjectClick(project)}
      onMouseEnter={() =>
        !reduced && animateEnabled && setHoveredCard(project.id)
      }
      onMouseLeave={() => !reduced && animateEnabled && setHoveredCard(null)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onProjectClick(project)}
      className="pg-card cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 opacity-0 transition-all duration-300"
      style={
        {
          ['--tw-ring-color' as string]: 'var(--border-strong)',
        } as React.CSSProperties
      }
      aria-label={`Open ${project.title}`}
    >
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border transition-all duration-300 hover:scale-[1.01] group"
        style={{
          background: 'var(--bg-2)',
          borderColor: isHovered
            ? 'var(--glow-cyan-30)'
            : 'var(--border-subtle)',
          boxShadow: isHovered
            ? '0 0 30px var(--glow-cyan-sm), inset 0 1px 0 var(--overlay-card-shadow-inner)'
            : 'inset 0 1px 0 var(--overlay-card-shadow-inner), 0 8px 32px var(--overlay-card-shadow-outer)',
        }}
      >
        <div className="relative aspect-video overflow-hidden">
          {project.thumbnail_url ? (
            <Image
              src={project.thumbnail_url}
              alt={`${project.title} thumbnail`}
              width={400}
              height={225}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'var(--bg-3)' }}
            >
              <span
                className="text-2xl font-display"
                style={{ color: 'var(--fg-1)' }}
              >
                {project.title.charAt(0)}
              </span>
            </div>
          )}
          {project.featured && (
            <div className="absolute top-2 left-2">
              <span
                className="inline-flex items-center px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[9px] tracking-[0.16em] border"
                style={{
                  background: 'var(--wash-amber)',
                  borderColor: 'var(--neon-amber)',
                  color: 'var(--fg-1)',
                }}
              >
                FEATURED
              </span>
            </div>
          )}

          {/* Project links overlay on hover */}
          {!reduced && animateEnabled && isHovered && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {project.project_url && (
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border"
                  style={{
                    background: 'var(--fg-1)',
                    color: 'var(--bg-1)',
                    borderColor: 'var(--fg-1)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} /> LIVE DEMO
                </a>
              )}
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border"
                  style={{
                    background: 'transparent',
                    color: 'var(--fg-1)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GitBranch size={12} /> SOURCE
                </a>
              )}
            </div>
          )}

          {/* Tech stack preview on hover */}
          {!reduced &&
            animateEnabled &&
            project.languages &&
            project.languages.length > 0 &&
            isHovered && (
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {project.languages.slice(0, 5).map((lang, idx) => (
                  <span
                    key={idx}
                    className="inline-flex px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[8px] tracking-[0.14em] border"
                    style={{
                      background: 'var(--overlay-card-bg)',
                      borderColor: 'var(--glow-cyan-30)',
                      color: 'var(--neon-cyan)',
                      boxShadow: '0 2px 8px var(--glow-cyan-sm)',
                    }}
                  >
                    {lang.toUpperCase()}
                  </span>
                ))}
                {project.languages.length > 5 && (
                  <span
                    className="inline-flex px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[8px] tracking-[0.14em] border"
                    style={{
                      background: 'var(--overlay-card-bg)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-3)',
                    }}
                  >
                    +{project.languages.length - 5}
                  </span>
                )}
              </div>
            )}
        </div>

        <div className="p-4 space-y-2">
          <h3
            className="font-display text-base tracking-wide group-hover:text-[var(--neon-cyan)] transition-colors duration-200"
            style={{ color: 'var(--fg-1)' }}
          >
            {project.title}
          </h3>
          {project.short_title && (
            <p
              className="text-[10px] font-mono"
              style={{ color: 'var(--fg-4)' }}
            >
              {project.short_title}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 pt-2">
            <StatBar
              label="COMPLEXITY"
              value={complexity}
              accent="cyan"
              showValue
            />
            {project.languages && project.languages.length > 0 && (
              <div
                className="flex items-center gap-1 flex-1"
                style={{ color: 'var(--fg-3)' }}
              >
                <Code size={10} />
                <span className="font-mono text-[9px] tracking-[0.14em]">
                  {project.languages.length} TECH
                </span>
              </div>
            )}
          </div>

          {project.languages && project.languages.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {project.languages.slice(0, 3).map((lang, idx) => (
                <span
                  key={idx}
                  className="inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] border group-hover:border-[var(--glow-cyan-30)] group-hover:text-[var(--neon-cyan)] transition-all duration-200"
                  style={{
                    background: 'var(--bg-3)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-3)',
                  }}
                >
                  {lang.toUpperCase()}
                </span>
              ))}
              {project.languages.length > 3 && (
                <span
                  className="inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] border"
                  style={{
                    background: 'var(--bg-3)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-3)',
                  }}
                >
                  +{project.languages.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Quick action hint */}
          {!reduced && animateEnabled && (
            <div className="pt-2 border-t border-[var(--border-subtle)] text-center">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[9px] tracking-[0.14em] border opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  background: 'var(--overlay-card-bg)',
                  borderColor: 'var(--glow-cyan-30)',
                  color: 'var(--fg-1)',
                }}
              >
                <Code size={9} /> VIEW DETAILS
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (reduced || !animateEnabled) {
    return (
      <Tilt3D key={project.id} intensity={0}>
        {cardContent}
      </Tilt3D>
    );
  }

  return (
    <Tilt3D key={project.id} intensity={4}>
      {cardContent}
    </Tilt3D>
  );
}

export default function ProjectGrid({
  projects,
  onProjectClick,
}: ProjectGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const reduced = isReducedMotion();
  const animateEnabled = canAnimate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: durations[700] ? durations[700] * 1000 : 700,
        ease: easings.outExpo ?? 'outExpo',
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      const cards = root.querySelectorAll('.pg-card');
      if (!cards.length) return;
      const cols =
        window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
      const rows = Math.ceil(cards.length / cols);
      animate(cards, {
        y: [20, 0],
        scale: [0.96, 1],
        opacity: [0, 1],
        delay: stagger(100, { grid: [cols, rows], from: 'center' }),
        duration: 800,
        ease: 'outExpo',
        autoplay: onScroll({ sync: false, enter: 'bottom-=50 top' }),
      });
    });

    return () => scope.revert();
  }, [projects.length]);

  return (
    <>
      <Head>
        <title>Projects | Fahimaloy Portfolio</title>
        <meta
          name="description"
          content="Explore Fahim Ahmed's featured projects showcasing full-stack development expertise"
        />
        <meta property="og:title" content="Projects | Fahimaloy Portfolio" />
        <meta
          property="og:description"
          content="Explore Fahim Ahmed's featured projects showcasing full-stack development expertise"
        />
        <meta property="og:url" content="https://fahimaloy.dev/projects" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Projects | Fahimaloy Portfolio" />
        <meta
          name="twitter:description"
          content="Explore Fahim Ahmed's featured projects showcasing full-stack development expertise"
        />
        <link rel="canonical" href="https://fahimaloy.dev/projects" />
      </Head>
      <section ref={rootRef} className="space-y-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span
            className="text-[10px] font-mono tracking-[0.32em]"
            style={{ color: 'var(--fg-4)' }}
          >
            {'// PROJECT_DATABASE'}
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: 'var(--fg-4)' }}
          >
            — {String(projects.length).padStart(2, '0')} ENTRIES LOADED
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                onProjectClick={onProjectClick}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
                reduced={reduced}
                animateEnabled={animateEnabled}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
