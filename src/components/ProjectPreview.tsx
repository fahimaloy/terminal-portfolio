// src/components/ProjectPreview.tsx
import React, { useState, useEffect, useId, useRef } from 'react';
import Image from 'next/image';
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
import { HOVER_LIFT_TRANSITION, type AccentColor } from '../config/animations';

/**
 * Per-index palette for the tab strip. `accent` is typed as the app-wide
 * `AccentColor` rather than a locally re-spelled union — this file used to
 * declare `type AccentName = (typeof COLOR_SETS)[number]['accent']`, which is
 * a second place to widen when `tokens.css` grows an accent.
 */
const COLOR_SETS: ReadonlyArray<{
  accent: AccentColor;
  text: string;
  border: string;
}> = [
  {
    accent: 'amber',
    text: 'text-neon-amber',
    border: 'border-neon-amber/30',
  },
  {
    accent: 'coral',
    text: 'text-neon-coral',
    border: 'border-neon-coral/30',
  },
  {
    accent: 'cyan',
    text: 'text-neon-cyan',
    border: 'border-neon-cyan/30',
  },
  {
    accent: 'amber',
    text: 'text-neon-amber',
    border: 'border-neon-amber/30',
  },
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
  const [mediaMap, setMediaMap] = useState<
    Record<number, PortfolioProjectMedia[]>
  >({});
  const [mediaLoading, setMediaLoading] = useState(true);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  /**
   * One instance id per rendered preview: `ChatMessage` can mount more than one
   * `ProjectPreview`, and a hardcoded panel id would collide across them.
   */
  const tabPanelId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabListId = useId();

  const activeProject = projects[activeIndex];
  const activeMedia = mediaMap[activeProject?.id] || [];
  const colors = getColor(activeIndex);
  const activeTabId = `${tabListId}-tab-${activeProject?.id}`;

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

  /**
   * Roving tabindex with automatic activation: the arrow keys move focus AND
   * selection together, so the one tab in the tab order is always the selected
   * tab and the two can never drift apart.
   */
  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    const total = projects.length;
    if (total < 2) return;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = (idx + 1) % total;
        break;
      case 'ArrowLeft':
        next = (idx - 1 + total) % total;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = total - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    tabRefs.current[next]?.focus();
    handleSelectProject(next);
  };

  if (!activeProject) return null;

  return (
    <div className={`w-full ${inline ? '' : 'max-w-4xl mx-auto'}`}>
      {showCloseButton && onClose && (
        <div className="flex justify-end mb-2">
          <NeonButton
            variant="ghost"
            accent="coral"
            onClick={onClose}
            iconLeft={<FiX />}
          >
            CLOSE
          </NeonButton>
        </div>
      )}

      {projects.length > 1 && (
        <div
          role="tablist"
          aria-label="Projects"
          className="flex flex-wrap justify-center gap-3 mb-4"
        >
          {projects.map((project, idx) => {
            const c = getColor(idx);
            const isActive = idx === activeIndex;
            const label = project.short_title || project.title;
            // `<button>` inside `Ripple` rather than attributes passed through
            // it: `Ripple`'s props type is `HTMLAttributes<HTMLDivElement>`, so
            // `role`/`tabIndex` would have been spread onto a div that still
            // cannot be activated by Enter or Space. A real button gets
            // keyboard activation, the focus ring and `type="button"` from the
            // platform. The ripple still fires — `Ripple` binds its own click
            // handler to its root div unconditionally, so a click on the button
            // bubbles up to it.
            return (
              <Ripple
                key={project.id}
                // The house lift rides HERE, on the wrapper that sits outside
                // the `HudPanel`, for two reasons that only hold together.
                //
                // 1. `Ripple` renders `overflow-hidden`, which clips the ink of
                //    its DESCENDANTS — a `box-shadow` on the `HudPanel` or the
                //    `<button>` inside would be trimmed to nothing, which is
                //    most likely why the retired glow looked unfixable in
                //    place. An element's own box-shadow is never clipped by
                //    its own `overflow`, so this wrapper is the only node here
                //    that can cast a halo.
                // 2. `HudPanel` owns the panel root and its entrance animation
                //    writes then clears inline `opacity`/`transform`/
                //    `transition` on exactly that node — a transition
                //    declared there is erased on mount. This wrapper is above
                //    it, so nothing here collides.
                //
                // Both branches of the glow below are the SAME 16px
                // `--card-glow` expression: the selected tab carries it as a
                // resting state, every other tab carries it on hover. That
                // replaced two 8px `--glow-<accent>` maps keyed per accent,
                // which contradicted the house lift on blur radius and glow
                // token and left two competing glow mechanisms on one card.
                //
                // Literal source text in both branches, never interpolation:
                // Tailwind generates utilities from the literal, so a computed
                // `'shadow-[0_0_16px_var(--glow-' + c.accent + ')]'` compiles
                // to nothing and paints nothing — which is how the dead class
                // survived unnoticed in the first place.
                className={`w-[150px] hover:-translate-y-0.5 hover:scale-[1.015] ${
                  isActive
                    ? 'shadow-[0_0_16px_var(--card-glow)]'
                    : 'hover:shadow-[0_0_16px_var(--card-glow)]'
                }`}
                style={
                  {
                    '--card-glow': `var(--glow-${c.accent}-sm)`,
                    transition: HOVER_LIFT_TRANSITION,
                  } as React.CSSProperties
                }
              >
                <button
                  type="button"
                  role="tab"
                  id={`${tabListId}-tab-${project.id}`}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  aria-selected={isActive}
                  aria-controls={tabPanelId}
                  // Roving tabindex: exactly one tab is in the tab order, so
                  // Tab leaves the strip instead of walking five stops. That is
                  // what makes `handleTabKeyDown` load-bearing rather than a
                  // nicety — without arrows, a roving tabindex would strand
                  // keyboard users on one tab.
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleSelectProject(idx)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className="block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]"
                >
                  <HudPanel
                    accent={c.accent}
                    className={`p-2 transition-all duration-200 ${
                      isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'
                    }`}
                    // `enter={false}` — this tab owns its resting state and it is
                    // deliberate: an inactive tab is `opacity-60` until hover, the
                    // active one is `scale-105`, and `transition-all duration-200`
                    // is what makes that dim-to-full crossfade read as a state
                    // change rather than a glitch. The entrance writes inline
                    // `opacity` and `transform` on this same node, which would
                    // override both of those for 300ms and then hand back a
                    // different value than it started from.
                    enter={false}
                  >
                    <div className="w-full h-16 overflow-hidden bg-[var(--overlay-black-medium)] mb-2 relative">
                      {project.thumbnail_url ? (
                        <Image
                          src={project.thumbnail_url}
                          alt={project.title}
                          width={150}
                          height={64}
                          className="w-full h-full object-cover"
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
                      {label}
                    </div>
                  </HudPanel>
                </button>
              </Ripple>
            );
          })}
        </div>
      )}

      <HudPanel
        accent={colors.accent}
        className="p-0 overflow-hidden"
        role="tabpanel"
        id={tabPanelId}
        aria-labelledby={activeTabId}
      >
        <div className="relative w-full aspect-video bg-[var(--overlay-black-60)]">
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
                    poster={
                      activeMedia[selectedMediaIndex].thumbnail_url || undefined
                    }
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <Image
                  src={activeMedia[selectedMediaIndex].url}
                  alt={activeProject.title}
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
                />
              )}
            </>
          )}
          {!mediaLoading && activeMedia.length === 0 && (
            <>
              {activeProject.image_url ? (
                <Image
                  src={activeProject.image_url}
                  alt={activeProject.title}
                  width={800}
                  height={450}
                  className="w-full h-full object-cover"
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
                    (prev) =>
                      (prev - 1 + activeMedia.length) % activeMedia.length,
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--overlay-black-50)] hover:bg-[var(--overlay-black-70)] text-text-secondary hover:text-text-primary transition-all"
                aria-label="Previous media"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setSelectedMediaIndex(
                    (prev) => (prev + 1) % activeMedia.length,
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--overlay-black-50)] hover:bg-[var(--overlay-black-70)] text-text-secondary hover:text-text-primary transition-all"
                aria-label="Next media"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {activeMedia.length > 1 && !mediaLoading && (
            <div className="absolute bottom-2 right-2 bg-[var(--overlay-black-60)] text-text-primary text-[10px] font-mono px-2 py-1">
              {selectedMediaIndex + 1} / {activeMedia.length}
            </div>
          )}
        </div>

        {activeMedia.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-[var(--overlay-black-20)]">
            {activeMedia.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedMediaIndex(idx)}
                className={`flex-shrink-0 w-20 h-14 overflow-hidden border-2 transition-all ${
                  idx === selectedMediaIndex
                    ? 'border-neon-cyan shadow-[0_0_8px_var(--glow-cyan)]'
                    : 'border-transparent hover:border-[var(--overlay-white-30)]'
                }`}
                aria-label={`Media ${idx + 1}`}
              >
                {m.media_type === 'video' ? (
                  <div className="relative w-full h-full bg-bg-ash flex items-center justify-center">
                    {m.thumbnail_url ? (
                      <Image
                        src={m.thumbnail_url}
                        alt=""
                        width={80}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    <FiVideo className="w-4 h-4 absolute text-text-primary" />
                  </div>
                ) : (
                  <Image
                    src={m.url}
                    alt=""
                    width={80}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-start gap-3">
            <h3
              className={`text-xl font-display tracking-wider ${colors.text}`}
            >
              {activeProject.title}
            </h3>
            {activeProject.featured && (
              <NeonChip accent="amber">FEATURED</NeonChip>
            )}
            {activeProject.short_title && (
              <NeonChip accent="cyan">{activeProject.short_title}</NeonChip>
            )}
          </div>

          {activeProject.languages && activeProject.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeProject.languages.map((lang, i) => (
                <NeonChip
                  key={i}
                  accent={getColor(i + activeProject.id).accent}
                >
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
                className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 bg-neon-amber/10 border border-neon-amber/40 text-neon-amber font-display text-[10px] tracking-[2px] hover:bg-neon-amber/20 transition-all"
                // Replaces the retired `text-shadow-neon-amber`, which was
                // `0 0 8px var(--neon-amber), 0 0 16px var(--glow-amber)` — an
                // opaque core. This is the same soft halo without the core, and
                // the LIVE link is the one accent-coloured outbound action on
                // the card, next to a neutral SOURCE link, so it is the one that
                // should be lit.
                style={{
                  textShadow: '0 0 12px var(--glow-amber-sm)',
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
                className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 bg-[var(--overlay-white-05)] border border-[var(--overlay-white-20)] text-text-primary font-display text-[10px] tracking-[2px] hover:bg-[var(--overlay-white-10)] transition-all"
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
