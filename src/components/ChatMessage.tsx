import React, { useState, useEffect, useRef } from 'react';
import { PortfolioProject } from '../utils/api';
import {
  parseAiResponse,
  findProjectsByIds,
  findProjectById,
  containsProjectMarker,
  ParsedSegment,
} from '../utils/aiResponseParser';
import ProjectPreview from './ProjectPreview';
import ProjectInlineRef from './ProjectInlineRef';

type ChatMessageProps = {
  role: 'user' | 'model';
  text: string;
  projects: PortfolioProject[];
};

export default function ChatMessage({
  role,
  text,
  projects,
}: ChatMessageProps) {
  const [openInlineProject, setOpenInlineProject] =
    useState<PortfolioProject | null>(null);
  const [previewProjects, setPreviewProjects] = useState<PortfolioProject[]>(
    [],
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const previewInitializedRef = useRef(false);

  const isUser = role === 'user';
  const hasMarkers = !isUser && containsProjectMarker(text);
  const segments = hasMarkers ? parseAiResponse(text) : [];

  // Auto-show preview for list/single markers (only for AI messages with markers)
  useEffect(() => {
    if (isUser || !hasMarkers || previewInitializedRef.current) return;

    const listSegments = segments.filter(
      (s): s is ParsedSegment & { type: 'project_list' | 'project_single' } =>
        s.type === 'project_list' || s.type === 'project_single',
    );

    if (listSegments.length > 0) {
      const segment = listSegments[0];
      if (segment.type === 'project_list') {
        const projs = findProjectsByIds(projects, segment.ids);
        if (projs.length > 0) {
          setPreviewProjects(projs);
          setPreviewIndex(0);
          setShowPreview(true);
          previewInitializedRef.current = true;
        }
      } else {
        const proj = findProjectById(projects, segment.id);
        if (proj) {
          setPreviewProjects([proj]);
          setPreviewIndex(0);
          setShowPreview(true);
          previewInitializedRef.current = true;
        }
      }
    }
  }, [isUser, hasMarkers, segments, projects]);

  // User message rendering
  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] md:max-w-[75%] px-4 py-3 msg-user backdrop-blur-sm text-white shadow-lg">
          {text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Plain AI message (no project markers)
  if (!hasMarkers) {
    return (
      <div className="flex w-full justify-start">
        <div className="max-w-[85%] md:max-w-[75%] px-4 py-3 msg-ai backdrop-blur-sm text-gray-100 shadow-lg">
          {text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Handle inline ref clicks
  const handleInlineRefOpen = (project: PortfolioProject) => {
    if (openInlineProject?.id === project.id) {
      setOpenInlineProject(null);
    } else {
      setOpenInlineProject(project);
    }
  };

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[90%] md:max-w-[82%] space-y-3">
        {/* Text segments */}
        <div className="px-4 py-3 msg-ai backdrop-blur-sm text-gray-100 shadow-lg space-y-2">
          {segments.map((segment, idx) => {
            switch (segment.type) {
              case 'text':
                return (
                  <p key={idx} className="leading-relaxed">
                    {segment.content.split('\n').map((line, li) => (
                      <React.Fragment key={li}>
                        {line}
                        {li < segment.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                );
              case 'project_ref': {
                const proj = findProjectById(projects, segment.id);
                if (!proj) return null;
                return (
                  <span key={idx} className="inline-block mx-1">
                    <ProjectInlineRef
                      project={proj}
                      onOpen={handleInlineRefOpen}
                      isOpen={openInlineProject?.id === proj.id}
                    />
                  </span>
                );
              }
              default:
                return null;
            }
          })}
        </div>

        {/* Inline project preview (opened from ref) */}
        {openInlineProject && (
          <div className="animate-fade-in-scale">
            <ProjectPreview
              projects={[openInlineProject]}
              selectedIndex={0}
              showCloseButton
              onClose={() => setOpenInlineProject(null)}
              inline
            />
          </div>
        )}

        {/* Auto preview for list/single markers */}
        {showPreview && previewProjects.length > 0 && !openInlineProject && (
          <div className="animate-fade-in-up">
            <ProjectPreview
              projects={previewProjects}
              selectedIndex={previewIndex}
              onSelectProject={(idx) => setPreviewIndex(idx)}
              inline
            />
          </div>
        )}
      </div>
    </div>
  );
}
