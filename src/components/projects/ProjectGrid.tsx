import Head from 'next/head';
import React from 'react';
import { PortfolioProject } from '../../utils/api';
import { HudPanel, NeonChip, StatBar, Tilt3D } from '../ui';
import { getProjectMetric } from '../../types/project';

const ACCENTS = ['yellow', 'magenta', 'cyan', 'green'] as const;

interface ProjectGridProps {
  projects: PortfolioProject[];
  onProjectClick: (project: PortfolioProject) => void;
}

export default function ProjectGrid({
  projects,
  onProjectClick,
}: ProjectGridProps) {
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
      <section className="space-y-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-[10px] font-display tracking-[4px] text-neon-cyan text-shadow-neon-cyan">
            {'// PROJECT_DATABASE'}
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            — {String(projects.length).padStart(2, '0')} ENTRIES LOADED
          </span>
        </div>
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => {
              const accent = ACCENTS[index % ACCENTS.length];
              const complexity = getProjectMetric(
                project,
                'complexity',
                50 + ((project.id * 7) % 40),
              );
              return (
                <Tilt3D key={project.id}>
                  <div
                    onClick={() => onProjectClick(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && onProjectClick(project)
                    }
                    className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
                    aria-label={`Open ${project.title}`}
                  >
                    <HudPanel
                      accent={accent}
                      notch="md"
                      title={`// PROJECT_${String(project.id).padStart(3, '0')}`}
                      className="overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="relative aspect-video">
                        {project.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={project.thumbnail_url}
                            alt={`${project.title} thumbnail`}
                            className="w-full h-full object-cover transition-all"
                            style={{
                              filter: 'saturate(1.2) contrast(1.1)',
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-bg-ash flex items-center justify-center">
                            <span className="text-2xl font-display text-text-primary">
                              {project.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        {project.featured && (
                          <div className="absolute top-2 left-2">
                            <NeonChip accent="yellow">FEATURED</NeonChip>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2">
                        <h3 className="font-display text-base text-text-primary tracking-wider">
                          {project.title}
                        </h3>
                        {project.short_title && (
                          <p className="text-[10px] font-mono text-neon-cyan">
                            {project.short_title}
                          </p>
                        )}
                        <StatBar
                          label="COMPLEXITY"
                          value={complexity}
                          accent={accent}
                          showValue
                        />
                        {project.languages && project.languages.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {project.languages
                              .slice(0, 3)
                              .map((lang, idx) => (
                                <NeonChip key={idx} accent="cyan">
                                  {lang}
                                </NeonChip>
                              ))}
                            {project.languages.length > 3 && (
                              <NeonChip accent="magenta">
                                +{project.languages.length - 3}
                              </NeonChip>
                            )}
                          </div>
                        )}
                      </div>
                    </HudPanel>
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
