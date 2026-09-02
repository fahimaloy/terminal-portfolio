// src/components/ChatMessage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { PortfolioProject, PortfolioSkill, PortfolioExperience } from '../utils/api';
import {
  parseAiResponse,
  findProjectsByIds,
  findProjectById,
  findSkillsByIds,
  findSkillById,
  containsAnyMarker,
  ParsedSegment,
} from '../utils/aiResponseParser';
import ProjectPreview from './ProjectPreview';
import ProjectInlineRef from './ProjectInlineRef';
import ProjectTableView from './ProjectTableView';
import ProjectDetailModal from './ProjectDetailModal';
import InlineProjectCard from './InlineProjectCard';
import SkillCard from './SkillCard';
import SkillGrid from './SkillGrid';
import ExperienceTimeline from './ExperienceTimeline';
import RichTextRenderer from './RichTextRenderer';
import { HudPanel, TypewriterText } from './ui';

type ChatMessageProps = {
  role: 'user' | 'model';
  text: string;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences?: PortfolioExperience[];
  responseType?: string;
  responseData?: any;
};

export default React.memo(function ChatMessage({
  role,
  text,
  projects,
  skills,
  experiences = [],
  responseType,
  responseData,
}: ChatMessageProps) {
  const [openInlineProject, setOpenInlineProject] =
    useState<PortfolioProject | null>(null);
  const [previewProjects, setPreviewProjects] = useState<PortfolioProject[]>(
    [],
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const previewInitializedRef = useRef(false);
  const [typedDone, setTypedDone] = useState(false);
  const [modalProjects, setModalProjects] = useState<PortfolioProject[]>([]);
  const [showModal, setShowModal] = useState(false);

  const isUser = role === 'user';
  const hasMarkers = !isUser && containsAnyMarker(text);
  const segments = hasMarkers ? parseAiResponse(text) : [];

  useEffect(() => {
    if (isUser || !hasMarkers || previewInitializedRef.current) return;
    const listSegments = segments.filter(
      (s): s is ParsedSegment & { type: 'project_list' | 'project_single' } =>
        s.type === 'project_list' || s.type === 'project_single',
    );
    if (listSegments.length > 0) {
      const seg = listSegments[0];
      if (seg.type === 'project_list') {
        const projs = findProjectsByIds(projects, seg.ids);
        if (projs.length > 0) {
          setPreviewProjects(projs);
          setPreviewIndex(0);
          setShowPreview(true);
          previewInitializedRef.current = true;
        }
      } else {
        const proj = findProjectById(projects, seg.id);
        if (proj) {
          setPreviewProjects([proj]);
          setPreviewIndex(0);
          setShowPreview(true);
          previewInitializedRef.current = true;
        }
      }
    }
  }, [isUser, hasMarkers, segments, projects]);

  useEffect(() => {
    setTypedDone(false);
  }, [text]);

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <HudPanel
          accent="yellow"
          notch="sm"
          className="max-w-[85%] md:max-w-[75%] px-4 py-3 hud-glow-yellow"
        >
          <div className="text-[10px] font-display tracking-[2px] text-neon-yellow text-shadow-neon-yellow mb-1">
            {'>> YOU'}
          </div>
          <div className="font-body text-sm text-text-primary whitespace-pre-wrap">
            {text}
          </div>
        </HudPanel>
      </div>
    );
  }

  // RAG response types - render custom components
  if (responseType === 'project_table' && responseData?.projects) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-[95%] md:max-w-[85%]">
          <HudPanel accent="cyan" notch="sm" className="px-4 py-3 hud-glow-cyan">
            <div className="text-[10px] font-display tracking-[2px] text-neon-cyan text-shadow-neon-cyan mb-3">
              {'> AI.RESPONSE'}
            </div>
            <ProjectTableView
              projects={responseData.projects}
              skills={skills}
              skillFilter={responseData.skillFilter}
            />
          </HudPanel>
        </div>
      </div>
    );
  }

  if (responseType === 'skill_list' && responseData?.skills) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-[95%] md:max-w-[85%]">
          <HudPanel accent="cyan" notch="sm" className="px-4 py-3 hud-glow-cyan">
            <div className="text-[10px] font-display tracking-[2px] text-neon-cyan text-shadow-neon-cyan mb-3">
              {'> AI.RESPONSE'}
            </div>
            <SkillGrid skills={responseData.skills} />
          </HudPanel>
        </div>
      </div>
    );
  }

  if (responseType === 'experience_timeline' && responseData?.experiences) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-[95%] md:max-w-[85%]">
          <HudPanel accent="cyan" notch="sm" className="px-4 py-3 hud-glow-cyan">
            <div className="text-[10px] font-display tracking-[2px] text-neon-cyan text-shadow-neon-cyan mb-3">
              {'> AI.RESPONSE'}
            </div>
            <ExperienceTimeline experiences={responseData.experiences} />
          </HudPanel>
        </div>
      </div>
    );
  }

  // AI response with markers
  if (!hasMarkers) {
    return (
      <div className="flex w-full justify-start">
        <HudPanel
          accent="cyan"
          notch="sm"
          className="max-w-[85%] md:max-w-[75%] px-4 py-3 hud-glow-cyan"
        >
          <div className="text-[10px] font-display tracking-[2px] text-neon-cyan text-shadow-neon-cyan mb-1">
            {'> AI.RESPONSE'}
          </div>
          <div className="font-body text-sm text-text-primary whitespace-pre-wrap">
            {typedDone ? (
              text
            ) : (
              <TypewriterText
                text={text}
                speed={10}
                onDone={() => setTypedDone(true)}
              />
            )}
          </div>
        </HudPanel>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[90%] md:max-w-[82%] space-y-3">
        <HudPanel accent="cyan" notch="sm" className="px-4 py-3 hud-glow-cyan">
          <div className="text-[10px] font-display tracking-[2px] text-neon-cyan text-shadow-neon-cyan mb-2">
            {'> AI.RESPONSE'}
          </div>
          <div className="font-body text-sm text-text-primary space-y-3">
            {segments.map((segment, idx) => {
              switch (segment.type) {
                case 'text':
                  return (
                    <span key={idx} className="block whitespace-pre-wrap">
                      {typedDone ? (
                        segment.content
                      ) : (
                        <TypewriterText
                          text={segment.content}
                          speed={6}
                          onDone={() => setTypedDone(true)}
                        />
                      )}
                    </span>
                  );
                case 'project_ref': {
                  const proj = findProjectById(projects, segment.id);
                  if (!proj) return null;
                  return (
                    <span key={idx} className="inline-block mx-1">
                      <InlineProjectCard
                        project={proj}
                        skills={skills}
                        onClick={() => {
                          setModalProjects([proj]);
                          setShowModal(true);
                        }}
                      />
                    </span>
                  );
                }
                case 'skill_ref': {
                  const skill = findSkillById(skills, segment.id);
                  if (!skill) return null;
                  return (
                    <span key={idx} className="inline-block mx-1">
                      <SkillCard skill={skill} inline />
                    </span>
                  );
                }
                case 'skill_list': {
                  const skillList = findSkillsByIds(skills, segment.ids);
                  return <SkillGrid key={idx} skills={skillList} />;
                }
                case 'experience_timeline':
                  return <ExperienceTimeline key={idx} experiences={experiences} />;
                case 'project_table':
                  return (
                    <ProjectTableView
                      key={idx}
                      projects={projects}
                      skills={skills}
                    />
                  );
                case 'project_list': {
                  const projs = findProjectsByIds(projects, segment.ids);
                  return (
                    <div key={idx} className="flex flex-wrap gap-3">
                      {projs.map((p) => (
                        <InlineProjectCard
                          key={p.id}
                          project={p}
                          skills={skills}
                          onClick={() => {
                            setModalProjects([p]);
                            setShowModal(true);
                          }}
                        />
                      ))}
                    </div>
                  );
                }
                case 'project_single': {
                  const proj = findProjectById(projects, segment.id);
                  if (!proj) return null;
                  return (
                    <div key={idx}>
                      <InlineProjectCard
                        project={proj}
                        skills={skills}
                        onClick={() => {
                          setModalProjects([proj]);
                          setShowModal(true);
                        }}
                      />
                    </div>
                  );
                }
                default:
                  return null;
              }
            })}
          </div>
        </HudPanel>

        {openInlineProject && (
          <div>
            <ProjectPreview
              projects={[openInlineProject]}
              selectedIndex={0}
              showCloseButton
              onClose={() => setOpenInlineProject(null)}
              inline
            />
          </div>
        )}

        {showPreview && previewProjects.length > 0 && !openInlineProject && (
          <div>
            <ProjectPreview
              projects={previewProjects}
              selectedIndex={previewIndex}
              onSelectProject={setPreviewIndex}
              inline
            />
          </div>
        )}
      </div>

      <ProjectDetailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projects={modalProjects}
        skills={skills}
      />
    </div>
  );
});
