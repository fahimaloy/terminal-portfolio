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

const MediaPage = () => {
  const { authorized, loading, user } = useAdminGuard();
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
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

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

  const updateStatus = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleAddMediaByUrl = async () => {
    if (!selectedProjectId || !mediaUrl.trim()) {
      updateStatus('Select a project and enter a media URL.');
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

    updateStatus(ok ? 'Media added.' : 'Failed to add media.');
    if (ok) {
      setMediaUrl('');
      const media = await getProjectMedia([selectedProjectId]);
      setProjectMedia(media);
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
      updateStatus('Select a project first.');
      return;
    }

    setIsSaving(true);
    const file = event.target.files[0];
    const publicUrl = await uploadProjectAsset(file);

    if (!publicUrl) {
      updateStatus(
        'Upload failed. Ensure bucket exists and public access is enabled.',
      );
      setIsSaving(false);
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

    updateStatus(
      ok ? 'Media uploaded and linked.' : 'Failed to link uploaded media.',
    );
    if (ok) {
      const media = await getProjectMedia([selectedProjectId]);
      setProjectMedia(media);
    }
    setIsSaving(false);
  };

  const handleDeleteMedia = async (id: number) => {
    if (!window.confirm('Delete this media?')) {
      return;
    }

    setIsSaving(true);
    const ok = await deleteProjectMedia(id);
    updateStatus(ok ? 'Media deleted.' : 'Failed to delete media.');
    if (ok && selectedProjectId) {
      const media = await getProjectMedia([selectedProjectId]);
      setProjectMedia(media);
    }
    setIsSaving(false);
  };

  const filteredMedia = selectedProjectId
    ? projectMedia.filter((item) => item.project_id === selectedProjectId)
    : [];

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Media - Admin Panel</title>
      </Head>

      <AdminLayout user={user}>
        <div>
          <h2 className="text-2xl font-bold mb-6">Manage Project Media</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-green-900 text-green-300 border border-green-400 text-sm">
              {statusMessage}
            </div>
          )}

          <div className="border border-green-400 p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">Select Project</h3>

            {projects.length > 0 ? (
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                disabled={isSaving}
                className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-green-300">No projects available</p>
            )}
          </div>

          {selectedProjectId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="border border-green-400 p-6">
                <h3 className="text-lg font-bold mb-4">Add Media</h3>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm mb-1">Media Type:</label>
                    <select
                      value={mediaType}
                      onChange={(e) =>
                        setMediaType(e.target.value as 'image' | 'video')
                      }
                      disabled={isSaving}
                      className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  {mediaType === 'video' && (
                    <div>
                      <label className="block text-sm mb-1">
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
                        className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                      >
                        <option value="direct">Direct Upload</option>
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-1">Media URL:</label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                      placeholder="Enter media URL"
                    />
                  </div>

                  <button
                    onClick={handleAddMediaByUrl}
                    disabled={isSaving}
                    className="w-full px-4 py-2 bg-green-400 text-black font-bold hover:bg-green-300 disabled:opacity-50"
                  >
                    {isSaving ? 'Adding...' : 'Add by URL'}
                  </button>
                </div>

                <div className="border-t border-green-400 pt-4">
                  <h4 className="text-sm font-bold mb-2">Or Upload File</h4>
                  <input
                    type="file"
                    onChange={handleMediaUpload}
                    disabled={isSaving}
                    accept="image/*,video/*"
                    className="w-full"
                  />
                  <p className="text-xs text-green-300 mt-2">
                    Accepts images and videos
                  </p>
                </div>
              </div>

              <div className="border border-green-400 p-6">
                <h3 className="text-lg font-bold mb-4">
                  Media ({filteredMedia.length})
                </h3>

                {filteredMedia.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredMedia.map((media) => (
                      <div
                        key={media.id}
                        className="p-3 bg-black border border-green-400"
                      >
                        <div className="text-xs text-green-300 mb-2">
                          {media.media_type.toUpperCase()}
                          {media.video_provider && ` (${media.video_provider})`}
                        </div>
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-400 underline break-all hover:text-green-300 mb-2 block"
                        >
                          {media.url.substring(0, 50)}...
                        </a>
                        <button
                          onClick={() => handleDeleteMedia(media.id)}
                          disabled={isSaving}
                          className="w-full px-2 py-1 bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-green-300">
                    No media for this project yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default MediaPage;
