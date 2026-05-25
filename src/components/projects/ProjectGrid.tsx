import Head from 'next/head';
import React from 'react';
import { PortfolioProject } from '../../utils/api';

// Color sets for random card backgrounds
const cardColorSets = [
  { bg: 'bg-gradient-to-br from-purple-600/20 to-violet-800/20', border: 'border-purple-500/30', text: 'text-purple-200' },
  { bg: 'bg-gradient-to-br from-cyan-600/20 to-blue-800/20', border: 'border-cyan-500/30', text: 'text-cyan-200' },
  { bg: 'bg-gradient-to-br from-pink-600/20 to-rose-800/20', border: 'border-pink-500/30', text: 'text-pink-200' },
  { bg: 'bg-gradient-to-br from-lime-600/20 to-emerald-800/20', border: 'border-lime-500/30', text: 'text-lime-200' },
  { bg: 'bg-gradient-to-br from-orange-600/20 to-amber-800/20', border: 'border-orange-500/30', text: 'text-orange-200' },
  { bg: 'bg-gradient-to-br from-yellow-600/20 to-amber-800/20', border: 'border-yellow-500/30', text: 'text-yellow-200' },
];

const getRandomCardColor = (index: number) => {
  return cardColorSets[index % cardColorSets.length];
};

interface ProjectGridProps {
  projects: PortfolioProject[];
  onProjectClick: (project: PortfolioProject) => void;
}

export default function ProjectGrid({ projects, onProjectClick }: ProjectGridProps) {
  return (
    <>
      <Head>
        <title>Projects | Fahimaloy Portfolio</title>
        <meta name="description" content="Explore Fahim Ahmed's featured projects showcasing full-stack development expertise" />
        <meta property="og:title" content="Projects | Fahimaloy Portfolio" />
        <meta property="og:description" content="Explore Fahim Ahmed's featured projects showcasing full-stack development expertise" />
        <meta property="og:url" content="https://fahimaloy.dev/projects" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Projects | Fahimaloy Portfolio" />
        <meta name="twitter:description" content="Explore Fahim Ahmed's featured projects showcasing full-stack development expertise" />
        <link rel="canonical" href="https://fahimaloy.dev/projects" />
      </Head>
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center mb-8">
          Featured Projects
        </h2>
        <div className="grid gap-6">
          {/* Mobile: 1 column */}
          {/* Tablet: 2 columns */}
          {/* Desktop: 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => {
              const colors = getRandomCardColor(index);
              return (
                <div
                  key={project.id}
                  onClick={() => onProjectClick(project)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onProjectClick(project)}
                  className={`premium-card cursor-pointer overflow-hidden transition-all duration-300 ${colors.bg} ${colors.border}`}
                >
                  {/* Project Thumbnail */}
                  <div className="relative aspect-w-16 aspect-h-9">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={`${project.title} thumbnail`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{project.title.charAt(0)}</span>
                      </div>
                    )}
                    {/* Featured Badge */}
                    {project.featured && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        Featured
                      </div>
                    )}
                  </div>
                  
                  {/* Project Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-white mb-2">{project.title}</h3>
                    {project.short_title && (
                      <p className="text-xs text-purple-400 mb-2">{project.short_title}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {/* Languages */}
                      {project.languages && project.languages.length > 0 && (
                        <span>
                          {project.languages.slice(0, 3).map((lang, idx) => (
                            <span key={idx} className="bg-purple-500/15 px-1.5 py-0.5 rounded-lg text-xs text-purple-300">
                              {lang}
                            </span>
                          ))}
                          {project.languages.length > 3 && (
                            <span className="bg-purple-500/15 px-1.5 py-0.5 rounded-lg text-xs text-purple-300">
                              +{project.languages.length - 3}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}