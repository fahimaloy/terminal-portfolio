import React from 'react';
import { PortfolioProject, PortfolioProjectMedia, getProjectMedia } from '../../utils/api';

// Color sets for random card backgrounds
const cardColorSets = [
  { bg: 'bg-blue-900/40', border: 'border-blue-500/40', text: 'text-blue-200' },
  { bg: 'bg-purple-900/40', border: 'border-purple-500/40', text: 'text-purple-200' },
  { bg: 'bg-emerald-900/40', border: 'border-emerald-500/40', text: 'text-emerald-200' },
  { bg: 'bg-amber-900/40', border: 'border-amber-500/40', text: 'text-amber-200' },
  { bg: 'bg-rose-900/40', border: 'border-rose-500/40', text: 'text-rose-200' },
  { bg: 'bg-cyan-900/40', border: 'border-cyan-500/40', text: 'text-cyan-200' },
  { bg: 'bg-violet-900/40', border: 'border-violet-500/40', text: 'text-violet-200' },
  { bg: 'bg-fuchsia-900/40', border: 'border-fuchsia-500/40', text: 'text-fuchsia-200' },
];

const getRandomCardColor = (index: number) => {
  return cardColorSets[index % cardColorSets.length];
};

interface ProjectDetailProps {
  project: PortfolioProject;
  onBack: () => void;
}

export default function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [media, setMedia] = React.useState<PortfolioProjectMedia[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Separate images and videos
  const images = media.filter(m => m.media_type === 'image');
  const videos = media.filter(m => m.media_type === 'video');
  
  // Current media state
  const [currentMediaIndex, setCurrentMediaIndex] = React.useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  
  // Get current media item
  const allMedia = [...images, ...videos];
  const currentMedia = allMedia[currentMediaIndex];
  
  // Fetch project media when project loads
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
  
  // Handle media change
  const handleMediaChange = (index: number) => {
    setCurrentMediaIndex(index);
    // Reset video playing state when switching media
    if (allMedia[index].media_type === 'video') {
      setIsVideoPlaying(true);
    } else {
      setIsVideoPlaying(false);
    }
  };
  
  // Handle video play/pause
  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };
  
  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };
  
  // Get random color for this project detail view
  const colors = getRandomCardColor(project.id || 0);
  
  if (loading) {
    return (
      <div className="space-y-8">
        {/* Back Button */}
        <div className="flex justify-between items-start">
          <button 
            onClick={onBack}
            className={`flex items-center gap-2 px-3 py-1 ${colors.bg} ${colors.border} rounded-lg text-sm hover:${colors.bg.replace('/40', '/50')} hover:${colors.border.replace('/40', '/60')} transition-all`}
          >
            <span>← Back to Projects</span>
          </button>
        </div>
        
        {/* Loading State */}
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div className="flex justify-between items-start">
        <button 
          onClick={onBack}
          className={`flex items-center gap-2 px-3 py-1 ${colors.bg} ${colors.border} rounded-lg text-sm hover:${colors.bg.replace('/40', '/50')} hover:${colors.border.replace('/40', '/60')} transition-all`}
        >
          <span>← Back to Projects</span>
        </button>
      </div>
      
      {/* Main Preview Area */}
      <div className="relative aspect-w-16 aspect-h-9 bg-black/50 overflow-hidden">
        {currentMedia && (
          <>
            {currentMedia.media_type === 'video' && (
              <div className="relative w-full h-full">
                {/* Video Player */}
                <video
                  src={currentMedia.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoPause}
                />
                {/* Play Overlay */}
                {!isVideoPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-white">Loading...</span>
                    </div>
                  </div>
                )}
                {/* Play Button */}
                {!isVideoPlaying && (
                  <button
                    onClick={handleVideoPlay}
                    className="absolute inset-0 flex items-center justify-center text-2xl text-white/70 hover:text-white"
                  >
                    ▶
                  </button>
                )}
              </div>
            )}
            {currentMedia.media_type === 'image' && (
              <img
                src={currentMedia.url}
                alt={`${project.title} media ${currentMediaIndex + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </>
        )}
        
        {/* Loading placeholder for media */}
        {!allMedia.length && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-400">No media available</p>
            </div>
          </div>
        )}
        
        {/* Media Counter */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {currentMediaIndex + 1} / {allMedia.length}
          </div>
        )}
      </div>
      
      {/* Project Title */}
      <h2 className={`text-3xl font-bold text-white ${colors.text}`}>{project.title}</h2>
      
      {/* Project Description */}
      <div className="prose prose-invert max-w-none">
        {project.description ? (
          <>
            {/* Simple markdown rendering - in production, use a proper markdown library */}
            <p>{project.description}</p>
          </>
        ) : (
          <p className="text-gray-400">No description available.</p>
        )}
      </div>
      
      {/* Additional Media Thumbnails */}
      {allMedia.length > 1 && (
        <div className="space-y-4">
          <h3 className={`text-xl font-bold text-white ${colors.text}`} mb-4>Additional Media</h3>
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {allMedia.map((mediaItem, index) => (
              <div
                key={mediaItem.id}
                onClick={() => handleMediaChange(index)}
                className={`cursor-pointer w-24 h-24 ${colors.bg} ${colors.border} rounded overflow-hidden ${
                  currentMediaIndex === index 
                    ? `border-[${colors.border}]/70 ring-2 ring-[${colors.border}]` 
                    : ''
                } hover:border-[${colors.border}]/60 transition-all`}
              >
                {mediaItem.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    ▶
                  </div>
                )}
                {mediaItem.media_type === 'image' && (
                  <img
                    src={mediaItem.thumbnail_url || mediaItem.url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Video Indicator */}
                {mediaItem.media_type === 'video' && (
                  <div className="absolute bottom-0 left-0 bg-black/50 text-xs text-white px-1">
                    VIDEO
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}