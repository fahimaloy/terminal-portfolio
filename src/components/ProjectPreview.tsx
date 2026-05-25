import React, { useState, useEffect } from 'react';
import {
  PortfolioProject,
  PortfolioProjectMedia,
  getProjectMedia,
} from '../utils/api';
import {
  FiExternalLink,
  FiGithub,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiVideo,
} from 'react-icons/fi';

// 8 vibrant color sets
const colorSets = [
  { bg: 'bg-gradient-to-br from-purple-600/25 to-violet-800/20', border: 'border-purple-500/30', text: 'text-purple-200', icon: 'text-purple-400', glow: 'rgba(139,92,246,0.3)' },
  { bg: 'bg-gradient-to-br from-cyan-600/25 to-blue-800/20', border: 'border-cyan-500/30', text: 'text-cyan-200', icon: 'text-cyan-400', glow: 'rgba(6,182,212,0.3)' },
  { bg: 'bg-gradient-to-br from-pink-600/25 to-rose-800/20', border: 'border-pink-500/30', text: 'text-pink-200', icon: 'text-pink-400', glow: 'rgba(236,72,153,0.3)' },
  { bg: 'bg-gradient-to-br from-lime-600/25 to-emerald-800/20', border: 'border-lime-500/30', text: 'text-lime-200', icon: 'text-lime-400', glow: 'rgba(16,185,129,0.3)' },
  { bg: 'bg-gradient-to-br from-orange-600/25 to-amber-800/20', border: 'border-orange-500/30', text: 'text-orange-200', icon: 'text-orange-400', glow: 'rgba(249,115,22,0.3)' },
  { bg: 'bg-gradient-to-br from-yellow-600/25 to-amber-800/20', border: 'border-yellow-500/30', text: 'text-yellow-200', icon: 'text-yellow-400', glow: 'rgba(234,179,8,0.3)' },
  { bg: 'bg-gradient-to-br from-indigo-600/25 to-purple-800/20', border: 'border-indigo-500/30', text: 'text-indigo-200', icon: 'text-indigo-400', glow: 'rgba(99,102,241,0.3)' },
  { bg: 'bg-gradient-to-br from-rose-600/25 to-pink-800/20', border: 'border-rose-500/30', text: 'text-rose-200', icon: 'text-rose-400', glow: 'rgba(244,63,94,0.3)' },
];

const getColor = (index: number) => colorSets[index % colorSets.length];

type ProjectPreviewProps = {
  projects: PortfolioProject[];
  selectedIndex?: number;
  onSelectProject?: (index: number) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  inline?: boolean;
};

export default function ProjectPreview({
  projects,
  selectedIndex = 0,
  onSelectProject,
  onClose,
  showCloseButton = false,
  inline = false,
}: ProjectPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [mediaMap, setMediaMap] = useState<
    Record<number, PortfolioProjectMedia[]>
  >({});
  const [mediaLoading, setMediaLoading] = useState(true);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const activeProject = projects[activeIndex];
  const activeMedia = mediaMap[activeProject?.id] || [];

  useEffect(() => {
    setActiveIndex(selectedIndex);
    setSelectedMediaIndex(0);
  }, [selectedIndex]);

  useEffect(() => {
    const fetchAllMedia = async () => {
      setMediaLoading(true);
      const ids = projects.map((p) => p.id).filter(Boolean) as number[];
      try {
        const allMedia = await getProjectMedia(ids);
        const map: Record<number, PortfolioProjectMedia[]> = {};
        allMedia.forEach((m) => {
          if (!map[m.project_id]) map[m.project_id] = [];
          map[m.project_id].push(m);
        });
        setMediaMap(map);
      } catch {
        // silent
      } finally {
        setMediaLoading(false);
      }
    };
    if (projects.length > 0) fetchAllMedia();
  }, [projects]);

  const handleSelectProject = (idx: number) => {
    setActiveIndex(idx);
    setSelectedMediaIndex(0);
    onSelectProject?.(idx);
  };

  const handleMediaSelect = (idx: number) => {
    setSelectedMediaIndex(idx);
  };

  const allMediaItems = activeMedia;
  const currentMedia = allMediaItems[selectedMediaIndex];
  const colors = getColor(activeIndex);

  if (!activeProject) return null;

  return (
    <div
      className={`w-full ${
        inline ? '' : 'max-w-4xl mx-auto'
      } animate-fade-in-scale`}
    >
      {/* Close button for inline mode */}
      {showCloseButton && onClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-2 bg-[#1E293B]/80 hover:bg-[#334155] border border-gray-700 rounded-lg transition-all text-gray-400 hover:text-white"
            aria-label="Close project preview"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Multiple project cards row (only when > 1 project) */}
      {projects.length > 1 && (
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {projects.map((project, idx) => {
            const c = getColor(idx);
            const isActive = idx === activeIndex;
            return (
              <button
                key={project.id}
                onClick={() => handleSelectProject(idx)}
                className={`project-card-vibrant flex flex-col items-center p-3 rounded-xl border w-[160px] transition-all duration-200 ${
                  isActive
                    ? `${c.bg} ${
                        c.border
                      } ring-2 ring-offset-2 ring-offset-[#060b19] ring-[${c.border.replace(
                        '/40',
                        '/70',
                      )}]`
                    : 'bg-[#0F172A]/80 border-gray-700/50 hover:border-gray-500'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-full h-20 rounded-lg overflow-hidden mb-2 bg-black/30">
                  {project.thumbnail_url ? (
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={`text-lg font-bold ${c.text}`}>
                        {project.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Title */}
                <span
                  className={`text-xs font-medium text-center leading-tight ${
                    isActive ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {project.short_title || project.title}
                </span>
                {/* Languages */}
                <div className="flex flex-wrap gap-1 mt-1 justify-center">
                  {project.languages?.slice(0, 2).map((lang, li) => (
                    <span
                      key={li}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Hero Preview Area */}
      <div className="relative bg-black/40 rounded-xl overflow-hidden border border-gray-700/50 mb-4">
        {/* Main media preview */}
        <div className="relative w-full aspect-video bg-black/60">
          {/* Skeleton loader */}
          {mediaLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="skeleton-thumb w-full h-full absolute inset-0" />
                <span className="text-gray-500 text-sm z-10">
                  Loading media...
                </span>
              </div>
            </div>
          )}

          {currentMedia && !mediaLoading && (
            <>
              {currentMedia.media_type === 'video' ? (
                <div className="w-full h-full">
                  {currentMedia.video_provider === 'youtube' ? (
                    <div className="video-embed-wrapper rounded-none">
                      <iframe
                        src={currentMedia.url}
                        title={`${activeProject.title} video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      src={currentMedia.url}
                      controls
                      className="w-full h-full object-contain"
                      poster={currentMedia.thumbnail_url || undefined}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              ) : (
                <img
                  src={currentMedia.url}
                  alt={`${activeProject.title}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </>
          )}

          {!currentMedia && !mediaLoading && (
            <>
              {activeProject.image_url ? (
                <img
                  src={activeProject.image_url}
                  alt={activeProject.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/30 to-purple-900/30">
                  <FiImage className="w-16 h-16 text-gray-600" />
                </div>
              )}
            </>
          )}

          {/* Navigation arrows for media */}
          {allMediaItems.length > 1 && !mediaLoading && (
            <>
              <button
                onClick={() =>
                  setSelectedMediaIndex(
                    (prev) =>
                      (prev - 1 + allMediaItems.length) % allMediaItems.length,
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all text-white/70 hover:text-white"
                aria-label="Previous media"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setSelectedMediaIndex(
                    (prev) => (prev + 1) % allMediaItems.length,
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all text-white/70 hover:text-white"
                aria-label="Next media"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Media counter */}
          {allMediaItems.length > 1 && !mediaLoading && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
              {selectedMediaIndex + 1} / {allMediaItems.length}
            </div>
          )}
        </div>

        {/* Media thumbnail strip */}
        {allMediaItems.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-black/20 border-t border-gray-800/50">
            {allMediaItems.map((media, idx) => (
              <button
                key={media.id}
                onClick={() => handleMediaSelect(idx)}
                className={`project-media-thumb flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedMediaIndex
                    ? 'border-blue-500/70 ring-1 ring-blue-500/30'
                    : 'border-transparent hover:border-gray-600'
                }`}
              >
                {media.media_type === 'video' ? (
                  <div className="relative w-full h-full">
                    {media.thumbnail_url ? (
                      <img
                        src={media.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <FiVideo className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent border-l-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={media.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="space-y-4">
        {/* Title + badges */}
        <div className="flex flex-wrap items-start gap-3">
          <h3 className={`text-2xl font-bold text-white`}>
            {activeProject.title}
          </h3>
          {activeProject.featured && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-medium">
              Featured
            </span>
          )}
          {activeProject.short_title && (
            <span
              className={`px-2 py-0.5 ${colors.bg} ${colors.text} border ${colors.border} rounded-full text-xs`}
            >
              {activeProject.short_title}
            </span>
          )}
        </div>

        {/* Languages / Skills */}
        {activeProject.languages && activeProject.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeProject.languages.map((lang, li) => {
              const langColor = getColor(li + activeProject.id);
              return (
                <span
                  key={li}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 ${langColor.bg} ${langColor.text} border ${langColor.border} rounded-full text-xs font-medium`}
                >
                  {lang}
                </span>
              );
            })}
          </div>
        )}

        {/* Tags */}
        {activeProject.tags && activeProject.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeProject.tags.map((tag, ti) => (
              <span
                key={ti}
                className="px-2 py-0.5 bg-gray-800/60 text-gray-400 border border-gray-700/50 rounded-full text-[10px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {activeProject.description || 'No description available.'}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 pt-2">
          {activeProject.project_url && (
            <a
              href={activeProject.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-2 ${colors.bg} ${colors.border} ${colors.text} rounded-lg text-sm hover:brightness-110 transition-all`}
            >
              <FiExternalLink className="w-4 h-4" />
              Live Project
            </a>
          )}
          {activeProject.repo_url && (
            <a
              href={activeProject.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-800/60 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700/60 transition-all"
            >
              <FiGithub className="w-4 h-4" />
              Source Code
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
