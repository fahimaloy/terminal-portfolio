import React from 'react';
import { FiArrowLeft, FiExternalLink, FiGithub } from 'react-icons/fi';
import {
  PortfolioProject,
  PortfolioProjectMedia,
  getProjectMedia,
} from '../../utils/api';
import { GlitchText, HudPanel, NeonButton, NeonChip, StatBar } from '../ui';
import { getProjectMetric } from '../../types/project';

const ACCENTS = ['yellow', 'magenta', 'cyan', 'green'] as const;

interface ProjectDetailProps {
  project: PortfolioProject;
  onBack: () => void;
}

export default function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [media, setMedia] = React.useState<PortfolioProjectMedia[]>([]);
  const [loading, setLoading] = React.useState(true);

  const images = media.filter((m) => m.media_type === 'image');
  const videos = media.filter((m) => m.media_type === 'video');
  const allMedia = [...images, ...videos];

  const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const currentMedia = allMedia[currentMediaIndex];

  React.useEffect(() => {
    const fetchMedia = async () => {
      if (project.id) {
        setLoading(true);
        try {
          const mediaData = await getProjectMedia([project.id]);
          setMedia(mediaData);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching project media:', error);
          setMedia([]);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchMedia();
  }, [project.id]);

  const handleMediaChange = (index: number) => {
    if (index < 0 || index >= allMedia.length) return;
    setCurrentMediaIndex(index);
    setIsVideoPlaying(allMedia[index].media_type === 'video');
  };

  const accent = ACCENTS[(project.id || 0) % ACCENTS.length];

  if (loading) {
    return (
      <div className="space-y-6">
        <NeonButton
          variant="outline"
          accent="magenta"
          iconLeft={<FiArrowLeft />}
          onClick={onBack}
        >
          BACK TO PROJECTS
        </NeonButton>
        <HudPanel accent="cyan" notch="md" className="p-12 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin" />
          <div className="font-display tracking-[2px] text-neon-cyan">
            LOADING PROJECT…
          </div>
        </HudPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NeonButton
        variant="outline"
        accent="magenta"
        iconLeft={<FiArrowLeft />}
        onClick={onBack}
      >
        BACK TO PROJECTS
      </NeonButton>

      <HudPanel
        accent="cyan"
        notch="md"
        title={`// DETAIL: ${project.title.toUpperCase()}`}
        className="overflow-hidden"
      >
        {/* Main preview area */}
        <div className="relative w-full aspect-video bg-black/50">
          {currentMedia && currentMedia.media_type === 'video' && (
            <div className="relative w-full h-full">
              <video
                src={currentMedia.url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
              />
              {!isVideoPlaying && (
                <button
                  onClick={() => setIsVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center text-3xl text-white/70 hover:text-white"
                  aria-label="Play video"
                >
                  ▶
                </button>
              )}
            </div>
          )}
          {currentMedia && currentMedia.media_type === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentMedia.url}
              alt={`${project.title} media ${currentMediaIndex + 1}`}
              className="w-full h-full object-cover"
            />
          )}
          {!allMedia.length && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-muted">
              <div className="w-6 h-6 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin" />
              <div className="font-body text-sm">NO MEDIA AVAILABLE</div>
            </div>
          )}
          {allMedia.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-text-primary text-[10px] font-mono px-2 py-1">
              {currentMediaIndex + 1} / {allMedia.length}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <GlitchText accent="cyan" as="h2" className="text-2xl">
              {project.title}
            </GlitchText>
            {project.short_title && (
              <NeonChip accent="yellow">{project.short_title}</NeonChip>
            )}
            {project.featured && <NeonChip accent="magenta">FEATURED</NeonChip>}
          </div>

          {/* Description */}
          <div className="font-body text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {project.description || 'No description available.'}
          </div>

          {/* Languages */}
          {project.languages && project.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.languages.map((lang, i) => (
                <NeonChip key={i} accent="cyan">
                  {lang}
                </NeonChip>
              ))}
            </div>
          )}

          {/* Numeric metrics as stat bars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <StatBar
              label="COMPLEXITY"
              value={getProjectMetric(project, 'complexity', 75)}
              accent="cyan"
            />
            <StatBar
              label="QUALITY"
              value={getProjectMetric(project, 'quality', 90)}
              accent="yellow"
            />
            <StatBar
              label="MOMENTUM"
              value={getProjectMetric(project, 'momentum', 60)}
              accent="magenta"
            />
          </div>

          {/* External links */}
          <div className="flex flex-wrap gap-2 pt-2">
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <NeonButton accent="yellow" iconLeft={<FiExternalLink />}>
                  LIVE
                </NeonButton>
              </a>
            )}
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <NeonButton variant="outline" accent="cyan" iconLeft={<FiGithub />}>
                  SOURCE
                </NeonButton>
              </a>
            )}
          </div>
        </div>
      </HudPanel>

      {/* Thumbnail strip */}
      {allMedia.length > 1 && (
        <div>
          <div className="text-[9px] font-display tracking-[3px] text-text-muted mb-2">
            {'// ADDITIONAL_MEDIA'}
          </div>
          <div className="flex flex-wrap gap-2">
            {allMedia.map((m, index) => (
              <button
                key={m.id}
                onClick={() => handleMediaChange(index)}
                aria-label={`Media ${index + 1}`}
                className={`relative w-24 h-16 overflow-hidden clip-notch-sm transition-all ${
                  currentMediaIndex === index
                    ? 'border-2 border-neon-cyan shadow-[0_0_8px_var(--glow-cyan)]'
                    : 'border-2 border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {m.media_type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.thumbnail_url || m.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-bg-ash flex items-center justify-center text-text-primary text-xl">
                    ▶
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <NeonButton
        variant="outline"
        accent="magenta"
        iconLeft={<FiArrowLeft />}
        onClick={onBack}
      >
        BACK TO PROJECTS
      </NeonButton>
    </div>
  );
}
