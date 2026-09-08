import React from 'react';
import Image from 'next/image';
import { FiArrowLeft, FiExternalLink, FiGithub } from 'react-icons/fi';
import {
  PortfolioProject,
  PortfolioProjectMedia,
  getProjectMedia,
} from '../../utils/api';
import { StatBar } from '../ui';
import { getProjectMetric } from '../../types/project';

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

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.16em] border"
          style={{
            background: 'transparent',
            borderColor: 'var(--border-subtle)',
            color: 'var(--fg-2)',
          }}
        >
          <FiArrowLeft size={12} /> BACK TO PROJECTS
        </button>
        <div
          className="p-12 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border"
          style={{
            background: 'var(--bg-2)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--border-subtle)',
              borderTopColor: 'var(--fg-3)',
            }}
          />
          <div
            className="font-mono tracking-[0.2em] text-[11px]"
            style={{ color: 'var(--fg-3)' }}
          >
            LOADING PROJECT…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.16em] border"
        style={{
          background: 'transparent',
          borderColor: 'var(--border-subtle)',
          color: 'var(--fg-2)',
        }}
      >
        <FiArrowLeft size={12} /> BACK TO PROJECTS
      </button>

      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border"
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Top hairline accent */}
        <div className="h-[3px] w-full" style={{ background: 'var(--fg-3)' }} />
        <div
          className="px-3 py-2 border-b font-mono text-[10px] tracking-[0.2em]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--fg-4)' }}
        >
          {'// DETAIL: '}
          {project.title.toUpperCase()}
        </div>
        {/* Main preview area */}
        <div
          className="relative w-full aspect-video"
          style={{ background: 'var(--bg-1)' }}
        >
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
            <Image
              src={currentMedia.url}
              alt={`${project.title} media ${currentMediaIndex + 1}`}
              width={800}
              height={450}
              className="w-full h-full object-cover"
            />
          )}
          {!allMedia.length && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ color: 'var(--fg-4)' }}
            >
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{
                  borderColor: 'var(--border-subtle)',
                  borderTopColor: 'var(--fg-3)',
                }}
              />
              <div className="font-body text-sm">NO MEDIA AVAILABLE</div>
            </div>
          )}
          {allMedia.length > 1 && (
            <div
              className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-1 rounded-[var(--radius-sm)]"
              style={{ background: 'var(--bg-1)', color: 'var(--fg-2)' }}
            >
              {currentMediaIndex + 1} / {allMedia.length}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-2xl font-display font-medium"
              style={{ color: 'var(--fg-1)' }}
            >
              {project.title}
            </h2>
            {project.short_title && (
              <span
                className="inline-flex px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[10px] tracking-[0.14em] border"
                style={{
                  background: 'var(--bg-3)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--fg-3)',
                }}
              >
                {project.short_title}
              </span>
            )}
            {project.featured && (
              <span
                className="inline-flex px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[10px] tracking-[0.14em] border"
                style={{
                  background: 'var(--bg-3)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--fg-3)',
                }}
              >
                FEATURED
              </span>
            )}
          </div>

          {/* Description */}
          <div
            className="font-body text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--fg-2)' }}
          >
            {project.description || 'No description available.'}
          </div>

          {/* Languages */}
          {project.languages && project.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.languages.map((lang, i) => (
                <span
                  key={i}
                  className="inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] tracking-[0.14em] border"
                  style={{
                    background: 'var(--bg-3)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-3)',
                  }}
                >
                  {lang.toUpperCase()}
                </span>
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
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em]"
                  style={{ background: 'var(--fg-1)', color: 'var(--bg-1)' }}
                >
                  <FiExternalLink size={12} /> LIVE
                </span>
              </a>
            )}
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] border"
                  style={{
                    background: 'transparent',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-2)',
                  }}
                >
                  <FiGithub size={12} /> SOURCE
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {allMedia.length > 1 && (
        <div>
          <div
            className="text-[9px] font-mono tracking-[0.24em] mb-2"
            style={{ color: 'var(--fg-4)' }}
          >
            {'// ADDITIONAL_MEDIA'}
          </div>
          <div className="flex flex-wrap gap-2">
            {allMedia.map((m, index) => (
              <button
                key={m.id}
                onClick={() => handleMediaChange(index)}
                aria-label={`Media ${index + 1}`}
                className="relative w-24 h-16 overflow-hidden rounded-[var(--radius-sm)] border transition-opacity"
                style={{
                  borderColor:
                    currentMediaIndex === index ? 'var(--fg-3)' : 'transparent',
                  opacity: currentMediaIndex === index ? 1 : 0.6,
                }}
              >
                {m.media_type === 'image' ? (
                  <Image
                    src={m.thumbnail_url || m.url}
                    alt=""
                    width={96}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xl"
                    style={{ background: 'var(--bg-3)', color: 'var(--fg-1)' }}
                  >
                    ▶
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.16em] border"
        style={{
          background: 'transparent',
          borderColor: 'var(--border-subtle)',
          color: 'var(--fg-2)',
        }}
      >
        <FiArrowLeft size={12} /> BACK TO PROJECTS
      </button>
    </div>
  );
}
