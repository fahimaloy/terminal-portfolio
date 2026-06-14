// src/components/ProjectPreview.tsx
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
import { HudPanel, NeonButton, NeonChip, Ripple } from './ui';

const COLOR_SETS = [
  { accent: 'yellow' as const, text: 'text-neon-yellow', border: 'border-neon-yellow/30' },
  { accent: 'magenta' as const, text: 'text-neon-magenta', border: 'border-neon-magenta/30' },
  { accent: 'cyan' as const, text: 'text-neon-cyan', border: 'border-neon-cyan/30' },
  { accent: 'yellow' as const, text: 'text-neon-yellow', border: 'border-neon-yellow/30' },
];
const getColor = (i: number) => COLOR_SETS[i % COLOR_SETS.length];

type Props = {
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
}: Props) {
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [mediaMap, setMediaMap] = useState<Record<number, PortfolioProjectMedia[]>>({});
  const [mediaLoading, setMediaLoading] = useState(true);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const activeProject = projects[activeIndex];
  const activeMedia = mediaMap[activeProject?.id] || [];
  const colors = getColor(activeIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
    setSelectedMediaIndex(0);
  }, [selectedIndex]);

  useEffect(() => {
    const fetchAll = async () => {
      setMediaLoading(true);
      const ids = projects.map((p) => p.id).filter(Boolean) as number[];
      try {
        const all = await getProjectMedia(ids);
        const map: Record<number, PortfolioProjectMedia[]> = {};
        all.forEach((m) => {
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
    if (projects.length > 0) fetchAll();
  }, [projects]);

  const handleSelectProject = (idx: number) => {
    setActiveIndex(idx);
    setSelectedMediaIndex(0);
    onSelectProject?.(idx);
  };

  if (!activeProject) return null;

  return (
    <div className={`w-full ${inline ? '' : 'max-w-4xl mx-auto'}`}>
      {showCloseButton && onClose && (
        <div className="flex justify-end mb-2">
          <NeonButton
            variant="ghost"
            accent="magenta"
            onClick={onClose}
            iconLeft={<FiX />}
          >
            CLOSE
          </NeonButton>
        </div>
      )}

{projects.length > 1 && (
         <div className="flex flex-wrap justify-center gap-3 mb-4">
           {projects.map((project, idx) => {
             const c = getColor(idx);
             const isActive = idx === activeIndex;
             return (
               <Ripple
                 key={project.id}
                 onClick={() => handleSelectProject(idx)}
                 className="w-[150px] cursor-pointer"
               >
                 <HudPanel
                   accent={c.accent}
                   notch="sm"
                   className={`p-2 transition-all duration-200 ${
                     isActive ? 'scale-105 hud-glow-' + c.accent.replace('neon-', '') : 'opacity-60 hover:opacity-100 hover:hud-glow-' + c.accent.replace('neon-', '')
                   }`}
                 >
                   <div className="w-full h-16 overflow-hidden bg-black/30 mb-2">
                     {project.thumbnail_url ? (
                       // eslint-disable-next-line @next/next/no-img-element
                       <img
                         src={project.thumbnail_url}
                         alt={project.title}
                         className="w-full h-full object-cover"
                         loading="lazy"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center">
                         <span className={`text-lg font-display ${c.text}`}>
                           {project.title.charAt(0)}
                         </span>
                       </div>
                     )}
                   </div>
                   <div className="text-[10px] font-display tracking-[1.5px] text-center text-text-primary">
                     {project.short_title || project.title}
                   </div>
                 </HudPanel>
               </Ripple>
             );
           })}
         </div>
       )}

      <HudPanel accent={colors.accent} notch="md" className="p-0 overflow-hidden">
        <div className="relative w-full aspect-video bg-black/60">
          {mediaLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted font-body text-sm">
              Loading media...
            </div>
          )}
          {!mediaLoading && activeMedia[selectedMediaIndex] && (
            <>
              {activeMedia[selectedMediaIndex].media_type === 'video' ? (
                activeMedia[selectedMediaIndex].video_provider === 'youtube' ? (
                  <iframe
                    src={activeMedia[selectedMediaIndex].url}
                    title={`${activeProject.title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <video
                    src={activeMedia[selectedMediaIndex].url}
                    controls
                    poster={activeMedia[selectedMediaIndex].thumbnail_url || undefined}
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeMedia[selectedMediaIndex].url}
                  alt={activeProject.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </>
          )}
          {!mediaLoading && activeMedia.length === 0 && (
            <>
              {activeProject.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeProject.image_url}
                  alt={activeProject.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <FiImage className="w-16 h-16" />
                </div>
              )}
            </>
          )}

          {activeMedia.length > 1 && !mediaLoading && (
            <>
              <button
                onClick={() =>
                  setSelectedMediaIndex(
                    (prev) => (prev - 1 + activeMedia.length) % activeMedia.length,
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-text-secondary hover:text-text-primary transition-all"
                aria-label="Previous media"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setSelectedMediaIndex((prev) => (prev + 1) % activeMedia.length)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-text-secondary hover:text-text-primary transition-all"
                aria-label="Next media"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {activeMedia.length > 1 && !mediaLoading && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-text-primary text-[10px] font-mono px-2 py-1">
              {selectedMediaIndex + 1} / {activeMedia.length}
            </div>
          )}
        </div>

        {activeMedia.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-black/20">
            {activeMedia.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedMediaIndex(idx)}
                className={`flex-shrink-0 w-20 h-14 overflow-hidden border-2 transition-all ${
                  idx === selectedMediaIndex
                    ? 'border-neon-cyan shadow-[0_0_8px_var(--glow-cyan)]'
                    : 'border-transparent hover:border-white/30'
                }`}
                aria-label={`Media ${idx + 1}`}
              >
                {m.media_type === 'video' ? (
                  <div className="relative w-full h-full bg-bg-ash flex items-center justify-center">
                    {m.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                    <FiVideo className="w-4 h-4 absolute text-text-primary" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-start gap-3">
            <h3 className={`text-xl font-display tracking-wider ${colors.text}`}>
              {activeProject.title}
            </h3>
            {activeProject.featured && (
              <NeonChip accent="yellow">FEATURED</NeonChip>
            )}
            {activeProject.short_title && (
              <NeonChip accent="cyan">{activeProject.short_title}</NeonChip>
            )}
          </div>

          {activeProject.languages && activeProject.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeProject.languages.map((lang, i) => (
                <NeonChip key={i} accent={getColor(i + activeProject.id).accent}>
                  {lang}
                </NeonChip>
              ))}
            </div>
          )}

          <div className="font-body text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {activeProject.description || 'No description available.'}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {activeProject.project_url && (
              <a
                href={activeProject.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neon-yellow/10 border border-neon-yellow/40 text-neon-yellow text-shadow-neon-yellow font-display text-[10px] tracking-[2px] hover:bg-neon-yellow/20 transition-all"
                style={{
                  clipPath:
                    'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
                }}
              >
                <FiExternalLink className="w-3 h-3" />
                LIVE
              </a>
            )}
            {activeProject.repo_url && (
              <a
                href={activeProject.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/20 text-text-primary font-display text-[10px] tracking-[2px] hover:bg-white/10 transition-all"
                style={{
                  clipPath:
                    'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
                }}
              >
                <FiGithub className="w-3 h-3" />
                SOURCE
              </a>
            )}
          </div>
        </div>
      </HudPanel>
    </div>
  );
}
