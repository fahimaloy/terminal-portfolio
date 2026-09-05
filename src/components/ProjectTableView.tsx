// src/components/ProjectTableView.tsx
import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import RichTextRenderer from './RichTextRenderer';
import { ArrowLeft, ExternalLink, Code } from 'lucide-react';

type ProjectTableViewProps = {
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  skillFilter?: number[];
};

export default function ProjectTableView({
  projects,
  skills,
  skillFilter,
}: ProjectTableViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobileDetail, setIsMobileDetail] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!skillFilter?.length) return projects;
    return projects.filter((p) =>
      p.tags?.some((t) => {
        const skill = skills.find((s) => s.name === t);
        return skill && skillFilter.includes(skill.id);
      }),
    );
  }, [projects, skills, skillFilter]);

  const selected = filteredProjects[selectedIndex];

  if (!filteredProjects.length) {
    return (
      <div className="text-center text-text-muted py-8">
        No projects found matching the selected filters.
      </div>
    );
  }

  // Mobile: show list or detail
  if (isMobileDetail && selected) {
    return (
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileDetail(false)}
          className="flex items-center gap-2 text-neon-cyan text-sm mb-4"
        >
          <ArrowLeft size={16} /> Back to projects
        </button>
        <ProjectDetail project={selected} skills={skills} />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Project list */}
      <div
        className={`w-full md:w-1/3 space-y-2 ${
          isMobileDetail ? 'hidden md:block' : ''
        }`}
      >
        {filteredProjects.map((project, idx) => (
          <button
            key={project.id}
            onClick={() => {
              setSelectedIndex(idx);
              setIsMobileDetail(true);
            }}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              idx === selectedIndex
                ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
                : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
            }`}
          >
            <div className="font-display text-sm tracking-wide">
              {project.short_title || project.title}
            </div>
            {project.languages && project.languages.length > 0 && (
              <div className="text-[10px] text-text-muted mt-1">
                {project.languages.slice(0, 3).join(' · ')}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Detail area */}
      <div className="flex-1 hidden md:block">
        {selected && <ProjectDetail project={selected} skills={skills} />}
      </div>
    </div>
  );
}

function ProjectDetail({
  project,
  skills,
}: {
  project: PortfolioProject;
  skills: PortfolioSkill[];
}) {
  const [mainMediaIndex, setMainMediaIndex] = useState(0);

  const allMedia = useMemo(() => {
    const items: {
      type: 'image' | 'video';
      url: string;
      thumbnail?: string;
    }[] = [];
    if (project.thumbnail_url)
      items.push({ type: 'image', url: project.thumbnail_url });
    if (project.image_url && project.image_url !== project.thumbnail_url) {
      items.push({ type: 'image', url: project.image_url });
    }
    return items;
  }, [project]);

  const mainMedia = allMedia[mainMediaIndex] || allMedia[0];

  const projectSkills = useMemo(() => {
    return skills.filter((s) => project.tags?.includes(s.name));
  }, [project, skills]);

  return (
    <div className="space-y-4">
      {/* Main media preview */}
      {mainMedia && (
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/40 relative">
          <Image
            src={mainMedia.url}
            alt={project.title}
            width={480}
            height={270}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Thumbnail strip */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {allMedia.map((media, idx) => (
            <button
              key={idx}
              onClick={() => setMainMediaIndex(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === mainMediaIndex
                  ? 'border-neon-cyan'
                  : 'border-transparent opacity-60'
              }`}
            >
              <Image
                src={media.thumbnail || media.url}
                alt=""
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Project info */}
      <div>
        <h3 className="font-display text-lg text-neon-cyan text-shadow-neon-cyan">
          {project.title}
        </h3>

        {/* Client info */}
        {project.client_name && (
          <div className="flex items-center gap-3 mt-2 p-2 bg-white/5 rounded-xl">
            {project.client_logo ? (
              <Image
                src={project.client_logo}
                alt={project.client_name || ''}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-xs font-bold text-white">
                {project.client_name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}
            <div>
              <div className="text-sm text-white">{project.client_name}</div>
              {project.client_location && (
                <div className="text-[10px] text-text-muted">
                  {project.client_location}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {projectSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {projectSkills.map((s) => (
              <span
                key={s.id}
                className="text-[10px] font-display tracking-wider px-2 py-0.5 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan rounded-full"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="mt-4 text-sm text-text-secondary leading-relaxed">
          {project.description_html ? (
            <RichTextRenderer html={project.description_html} />
          ) : (
            project.description
          )}
        </div>

        {/* Links */}
        <div className="flex gap-3 mt-4">
          {project.project_url && (
            <a
              href={project.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-neon-yellow hover:underline"
            >
              <ExternalLink size={12} /> Live Demo
            </a>
          )}
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-neon-yellow hover:underline"
            >
              <Code size={12} /> Repository
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
