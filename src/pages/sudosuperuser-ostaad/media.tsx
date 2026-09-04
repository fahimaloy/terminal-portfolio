import Head from 'next/head';
import React from 'react';
import {
  getPortfolioProjects,
  getProjectMedia,
  addProjectMedia,
  deleteProjectMedia,
  uploadProjectAsset,
  PortfolioProject,
  PortfolioProjectMedia,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { useToast } from '../../components/ui/Toast';
import { useStagger } from '../../hooks/useStagger';
import { NeonButton, GlitchText, HudPanel } from '../../components/ui';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

const MediaPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const [projects, setProjects] = React.useState<PortfolioProject[]>([]);
  const [projectMedia, setProjectMedia] = React.useState<
    PortfolioProjectMedia[]
  >([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<
    number | null
  >(null);
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [mediaType, setMediaType] = React.useState<'image' | 'video'>('image');
  const [videoProvider, setVideoProvider] = React.useState<
    'youtube' | 'vimeo' | 'direct'
  >('direct');
  const [isSaving, setIsSaving] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Stagger grid items
  useStagger({
    rootRef: gridRef,
    selector: '.media-item',
    mode: 'grid',
    delay: 60,
    respectReduced: true,
  });

  const loadData = React.useCallback(async () => {
    const projectsData = await getPortfolioProjects();
    setProjects(projectsData);

    if (projectsData.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectsData[0].id);
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  React.useEffect(() => {
    const loadProjectMedia = async () => {
      if (selectedProjectId) {
        const media = await getProjectMedia([selectedProjectId]);
        setProjectMedia(media);
      }
    };

    if (authorized && selectedProjectId) {
      loadProjectMedia();
    }
  }, [authorized, selectedProjectId]);

  const handleAddMediaByUrl = async () => {
    if (!selectedProjectId || !mediaUrl.trim()) {
      toastError('Select a project and enter a media URL.');
      return;
    }

    setIsSaving(true);
    const ok = await addProjectMedia({
      project_id: selectedProjectId,
      media_type: mediaType,
      url: mediaUrl.trim(),
      video_provider: mediaType === 'video' ? videoProvider : null,
      media_order: 1,
      is_visible: true,
    });

    if (ok) {
      success('Media added.');
      setMediaUrl('');
      const media = await getProjectMedia([selectedProjectId]);
      setProjectMedia(media);
    } else {
      toastError('Failed to add media.');
    }
    setIsSaving(false);
  };

  const handleMediaUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (
      !selectedProjectId ||
      !event.target.files ||
      event.target.files.length === 0
    ) {
      toastError('Select a project first.');
      return;
    }

    setIsSaving(true);
    setUploadProgress(10);

    const file = event.target.files[0];

    // Simulate progress since Supabase doesn't expose progress easily
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 15, 90));
    }, 200);

    const publicUrl = await uploadProjectAsset(file);

    clearInterval(progressInterval);
    setUploadProgress(100);

    if (!publicUrl) {
      toastError(
        'Upload failed. Ensure bucket exists and public access is enabled.',
      );
      setIsSaving(false);
      setUploadProgress(0);
      return;
    }

    const ok = await addProjectMedia({
      project_id: selectedProjectId,
      media_type: file.type.startsWith('video') ? 'video' : 'image',
      url: publicUrl,
      media_order: 1,
      is_visible: true,
      video_provider: file.type.startsWith('video') ? 'direct' : null,
    });

    if (ok) {
      success('Media uploaded and linked.');
      const media = await getProjectMedia([selectedProjectId]);
      setProjectMedia(media);
    } else {
      toastError('Failed to link uploaded media.');
    }
    setIsSaving(false);
    setTimeout(() => setUploadProgress(0), 1000);
  };

  const handleDeleteMedia = async (id: number) => {
    setIsSaving(true);
    const ok = await deleteProjectMedia(id);
    if (ok) {
      success('Media deleted.');
      if (selectedProjectId) {
        const media = await getProjectMedia([selectedProjectId]);
        setProjectMedia(media);
      }
    } else {
      toastError('Failed to delete media.');
    }
    setConfirmDelete(null);
    setIsSaving(false);
  };

  const filteredMedia = selectedProjectId
    ? projectMedia.filter((item) => item.project_id === selectedProjectId)
    : [];

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Media - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div>
          <GlitchText
            accent="cyan"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            MANAGE PROJECT MEDIA
          </GlitchText>

          <HudPanel accent="cyan" notch="md" className="p-6 mb-8">
            <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-4">
              SELECT PROJECT
            </div>

            {projects.length > 0 ? (
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                disabled={isSaving}
                className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] clip-notch-sm transition-all duration-200 [color-scheme:dark]"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-body text-sm text-text-muted">
                No projects available
              </p>
            )}
          </HudPanel>

          {selectedProjectId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <HudPanel accent="cyan" notch="md" className="p-6">
                <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-4">
                  ADD MEDIA
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Media Type:
                    </label>
                    <select
                      value={mediaType}
                      onChange={(e) =>
                        setMediaType(e.target.value as 'image' | 'video')
                      }
                      disabled={isSaving}
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] clip-notch-sm transition-all duration-200 [color-scheme:dark]"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  {mediaType === 'video' && (
                    <div>
                      <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                        Video Provider:
                      </label>
                      <select
                        value={videoProvider}
                        onChange={(e) =>
                          setVideoProvider(
                            e.target.value as 'youtube' | 'vimeo' | 'direct',
                          )
                        }
                        disabled={isSaving}
                        className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] clip-notch-sm transition-all duration-200 [color-scheme:dark]"
                      >
                        <option value="direct">Direct Upload</option>
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Media URL:
                    </label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      disabled={isSaving}
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                      placeholder="Enter media URL"
                    />
                  </div>

                  <NeonButton
                    accent="cyan"
                    onClick={handleAddMediaByUrl}
                    disabled={isSaving}
                    loading={isSaving}
                  >
                    ADD BY URL
                  </NeonButton>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="font-display tracking-[2px] text-sm text-text-muted mb-2">
                    Or Upload File
                  </h4>
                  <input
                    type="file"
                    onChange={handleMediaUpload}
                    disabled={isSaving}
                    accept="image/*,video/*"
                    className="w-full font-body text-sm text-text-secondary file:mr-3 file:px-3 file:py-1.5 file:bg-transparent file:border file:border-neon-cyan/30 file:text-neon-cyan file:font-display file:text-[10px] file:tracking-[2px] file:clip-notch-sm hover:file:bg-neon-cyan/10 file:transition-all file:duration-200 file:cursor-pointer"
                  />
                  <p className="font-body text-xs text-text-muted mt-2">
                    Accepts images and videos
                  </p>

                  {/* Upload progress bar */}
                  {uploadProgress > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between font-body text-xs text-text-muted mb-1">
                        <span>Uploading...</span>
                        <span className="font-mono">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/[0.03] border border-white/10 clip-notch-sm overflow-hidden">
                        <div
                          className="h-full bg-neon-cyan shadow-[0_0_8px_var(--glow-cyan)] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </HudPanel>

              <HudPanel accent="magenta" notch="md" className="p-6">
                <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
                  MEDIA ({filteredMedia.length})
                </div>

                {filteredMedia.length > 0 ? (
                  <div
                    ref={gridRef}
                    className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto"
                  >
                    {filteredMedia.map((media) => (
                      <div
                        key={media.id}
                        className="media-item relative group clip-notch-sm overflow-hidden border border-white/10 bg-white/[0.03] hover:border-neon-cyan/30 transition-all duration-200"
                      >
                        {/* Thumbnail with zoom on hover */}
                        <div className="aspect-video overflow-hidden">
                          {media.media_type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={media.url}
                              alt="Media"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/40">
                              <span className="text-2xl">🎬</span>
                            </div>
                          )}
                        </div>

                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <NeonButton
                            variant="ghost"
                            accent="red"
                            onClick={() => setConfirmDelete(media.id)}
                            disabled={isSaving}
                          >
                            DELETE
                          </NeonButton>
                        </div>

                        <div className="p-2">
                          <div className="font-mono text-[10px] text-text-muted truncate">
                            {media.media_type.toUpperCase()}
                            {media.video_provider &&
                              ` (${media.video_provider})`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center font-body text-sm text-text-muted">
                    No media for this project yet
                  </div>
                )}
              </HudPanel>
            </div>
          )}
        </div>

        <ConfirmDeleteModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete !== null) handleDeleteMedia(confirmDelete);
          }}
          message="Delete this media? This cannot be undone."
          isSaving={isSaving}
        />
      </AdminLayout>
    </>
  );
};

export default MediaPage;
