import Head from 'next/head';
import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { PortfolioProject } from '../../utils/api';
import { StatBar, Tilt3D } from '../ui';
import { getProjectMetric } from '../../types/project';
import { animate, createScope, onScroll, stagger } from 'animejs';
import { durations, easings } from '../../config/animations';

interface ProjectGridProps {
  projects: PortfolioProject[];
  onProjectClick: (project: PortfolioProject) => void;
}

export default function ProjectGrid({
  projects,
  onProjectClick,
}: ProjectGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);

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
        y: [16, 0],
        scale: [0.98, 1],
        opacity: [0, 1],
        delay: stagger(120, { grid: [cols, rows], from: 'center' }),
        duration: 700,
        ease: 'outExpo',
        autoplay: onScroll({ sync: true, enter: 'bottom-=50 top' }),
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
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const complexity = getProjectMetric(
                project,
                'complexity',
                50 + ((project.id * 7) % 40),
              );
              return (
                <Tilt3D key={project.id} intensity={4}>
                  <div
                    onClick={() => onProjectClick(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && onProjectClick(project)
                    }
                    className="pg-card cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 opacity-0"
                    style={
                      {
                        ['--tw-ring-color' as string]: 'var(--border-strong)',
                      } as React.CSSProperties
                    }
                    aria-label={`Open ${project.title}`}
                  >
                    <div
                      className="overflow-hidden rounded-[var(--radius-lg)] border transition-transform duration-200 hover:scale-[1.01]"
                      style={{
                        background: 'var(--bg-2)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        {project.thumbnail_url ? (
                          <Image
                            src={project.thumbnail_url}
                            alt={`${project.title} thumbnail`}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
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
                                background: 'var(--bg-2)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--fg-2)',
                              }}
                            >
                              FEATURED
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        <h3
                          className="font-display text-base tracking-wide"
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
                        <StatBar
                          label="COMPLEXITY"
                          value={complexity}
                          accent="cyan"
                          showValue
                        />
                        {project.languages && project.languages.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {project.languages.slice(0, 3).map((lang, idx) => (
                              <span
                                key={idx}
                                className="inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] border"
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
                      </div>
                    </div>
                  </div>
                </Tilt3D>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
