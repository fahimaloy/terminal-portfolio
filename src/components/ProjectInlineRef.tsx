import React from 'react';
import { PortfolioProject } from '../utils/api';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const chipColors = [
  { bg: 'bg-blue-900/50', border: 'border-blue-500/50', text: 'text-blue-200' },
  {
    bg: 'bg-purple-900/50',
    border: 'border-purple-500/50',
    text: 'text-purple-200',
  },
  {
    bg: 'bg-emerald-900/50',
    border: 'border-emerald-500/50',
    text: 'text-emerald-200',
  },
  {
    bg: 'bg-amber-900/50',
    border: 'border-amber-500/50',
    text: 'text-amber-200',
  },
  { bg: 'bg-rose-900/50', border: 'border-rose-500/50', text: 'text-rose-200' },
  { bg: 'bg-cyan-900/50', border: 'border-cyan-500/50', text: 'text-cyan-200' },
  {
    bg: 'bg-violet-900/50',
    border: 'border-violet-500/50',
    text: 'text-violet-200',
  },
  {
    bg: 'bg-fuchsia-900/50',
    border: 'border-fuchsia-500/50',
    text: 'text-fuchsia-200',
  },
  { bg: 'bg-pink-900/50', border: 'border-pink-500/50', text: 'text-pink-200' },
  { bg: 'bg-lime-900/50', border: 'border-lime-500/50', text: 'text-lime-200' },
  {
    bg: 'bg-yellow-900/50',
    border: 'border-yellow-500/50',
    text: 'text-yellow-200',
  },
  {
    bg: 'bg-orange-900/50',
    border: 'border-orange-500/50',
    text: 'text-orange-200',
  },
  { bg: 'bg-teal-900/50', border: 'border-teal-500/50', text: 'text-teal-200' },
  { bg: 'bg-sky-900/50', border: 'border-sky-500/50', text: 'text-sky-200' },
  {
    bg: 'bg-indigo-900/50',
    border: 'border-indigo-500/50',
    text: 'text-indigo-200',
  },
  { bg: 'bg-red-900/50', border: 'border-red-500/50', text: 'text-red-200' },
  {
    bg: 'bg-green-900/50',
    border: 'border-green-500/50',
    text: 'text-green-200',
  },
];

const getChipColor = (id: number) => chipColors[id % chipColors.length];

type ProjectInlineRefProps = {
  project: PortfolioProject;
  onOpen?: (project: PortfolioProject) => void;
  isOpen?: boolean;
};

export default function ProjectInlineRef({
  project,
  onOpen,
  isOpen,
}: ProjectInlineRefProps) {
  const colors = getChipColor(project.id);

  return (
    <button
      onClick={() => onOpen?.(project)}
      className={`inline-project-chip ${colors.bg} ${colors.border} ${colors.text} group`}
      title={`Click to view ${project.title} details`}
    >
      {project.thumbnail_url ? (
        <img
          src={project.thumbnail_url}
          alt=""
          className="w-4 h-4 rounded-full object-cover"
        />
      ) : (
        <span className="w-4 h-4 rounded-full bg-current opacity-40 flex items-center justify-center text-[8px] font-bold">
          {project.title.charAt(0)}
        </span>
      )}
      <span className="truncate max-w-[120px]">
        {project.short_title || project.title}
      </span>
      {isOpen ? (
        <FiChevronUp className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      ) : (
        <FiChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
