// src/components/ProjectMatchForm.tsx
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { FiSearch, FiAlertCircle, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { PortfolioProject } from '../utils/api';
import {
  parseAiResponse,
  findProjectsByIds,
  findProjectById,
  ParsedSegment,
} from '../utils/aiResponseParser';
import ProjectPreview from './ProjectPreview';
import ProjectInlineRef from './ProjectInlineRef';
import { HudPanel, NeonButton } from './ui';
import { getErrorMessage } from '../utils/errorMessage';

type Props = {
  onBackToChat: () => void;
  projects: PortfolioProject[];
};

type FormState = 'filling' | 'submitting' | 'result' | 'error';

export default function ProjectMatchForm({ onBackToChat, projects }: Props) {
  const [formState, setFormState] = useState<FormState>('filling');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<string>('');
  const [segments, setSegments] = useState<ParsedSegment[]>([]);
  const [previewProjects, setPreviewProjects] = useState<PortfolioProject[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [openInlineProject, setOpenInlineProject] =
    useState<PortfolioProject | null>(null);

  // Stable array reference for the inline ProjectPreview so its
  // [projects] useEffect doesn't refetch media on every parent render.
  const inlinePreviewProjects = useMemo(
    () => (openInlineProject ? [openInlineProject] : []),
    [openInlineProject],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!description.trim()) {
      setErrorMsg('Please describe your project.');
      return;
    }
    if (description.trim().length < 20) {
      setErrorMsg('Please provide more detail (at least 20 characters).');
      return;
    }
    if (description.trim().length > 5000) {
      setErrorMsg('Description too long (max 5000 chars).');
      return;
    }
    setFormState('submitting');
    setShowPreview(false);
    setPreviewProjects([]);
    setOpenInlineProject(null);
    setSegments([]);
    try {
      const res = await axios.post('/api/project-match', {
        description: description.trim(),
      });
      const responseText = res.data?.text || 'No response received.';
      setResult(responseText);
      const parsed = parseAiResponse(responseText);
      setSegments(parsed);
      const lists = parsed.filter(
        (s): s is ParsedSegment & { type: 'project_list' | 'project_single' } =>
          s.type === 'project_list' || s.type === 'project_single',
      );
      if (lists.length > 0) {
        const seg = lists[0];
        if (seg.type === 'project_list') {
          const projs = findProjectsByIds(projects, seg.ids);
          if (projs.length > 0) {
            setPreviewProjects(projs);
            setPreviewIndex(0);
            setShowPreview(true);
          }
        } else {
          const proj = findProjectById(projects, seg.id);
          if (proj) {
            setPreviewProjects([proj]);
            setPreviewIndex(0);
            setShowPreview(true);
          }
        }
      }
      setFormState('result');
    } catch (err: unknown) {
      setFormState('error');
      setErrorMsg(getErrorMessage(err, 'Failed to analyze. Please try again.'));
    }
  };

  return (
    <div className="space-y-3">
      {formState === 'filling' && (
        <>
          <HudPanel accent="green" notch="md" className="p-3 flex items-start gap-3">
            <FiSearch className="w-5 h-5 text-neon-yellow flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-display text-[10px] tracking-[3px] text-neon-yellow mb-1">
                PROJECT MATCH
              </div>
              <div className="font-body text-xs text-text-secondary">
                Describe your project idea and I&apos;ll check my portfolio for
                similar work I&apos;ve done.
              </div>
            </div>
          </HudPanel>

          {errorMsg && (
            <HudPanel accent="red" notch="sm" className="p-3 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 text-neon-red flex-shrink-0" />
              <span className="font-body text-sm text-neon-red">{errorMsg}</span>
            </HudPanel>
          )}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project idea in detail..."
            maxLength={5000}
            rows={6}
            className="w-full bg-bg-smoke border border-white/10 text-text-primary p-3 font-body text-sm focus:outline-none focus:border-neon-yellow placeholder-text-muted resize-none"
            style={{
              clipPath:
                'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
            }}
            disabled={false}
          />
          <div className="flex justify-end">
            <span className="text-[10px] font-mono text-text-muted">
              {description.length}/5000
            </span>
          </div>

          <div className="flex gap-2">
            <NeonButton
              accent="yellow"
              iconLeft={<FiSearch />}
              onClick={handleSubmit}
              disabled={!description.trim() || description.trim().length < 20}
            >
              CHECK PORTFOLIO
            </NeonButton>
            <NeonButton variant="ghost" accent="cyan" onClick={onBackToChat}>
              CANCEL
            </NeonButton>
          </div>
        </>
      )}

      {formState === 'submitting' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-neon-yellow/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-neon-yellow rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <div className="font-display tracking-[2px] text-neon-yellow">
              ANALYZING…
            </div>
            <div className="font-body text-sm text-text-muted mt-1">
              Checking my portfolio for similar work
            </div>
          </div>
        </div>
      )}

      {formState === 'result' && (
        <div className="space-y-4">
          <HudPanel accent="green" notch="md" className="p-3 flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-neon-green flex-shrink-0" />
            <span className="font-display text-[10px] tracking-[3px] text-neon-green">
              ANALYSIS COMPLETE
            </span>
          </HudPanel>

          <HudPanel accent="cyan" notch="md" className="p-4">
            <div className="font-body text-sm text-text-secondary space-y-2">
              {segments.map((segment, idx) => {
                switch (segment.type) {
                  case 'text':
                    return <p key={idx}>{segment.content}</p>;
                  case 'project_ref': {
                    const proj = findProjectById(projects, segment.id);
                    if (!proj) return null;
                    return (
                      <span key={idx} className="inline-block mx-1">
                        <ProjectInlineRef
                          project={proj}
                          onOpen={setOpenInlineProject}
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
          </HudPanel>

          {openInlineProject && (
            <ProjectPreview
              projects={inlinePreviewProjects}
              selectedIndex={0}
              showCloseButton
              onClose={() => setOpenInlineProject(null)}
              inline
            />
          )}

          {showPreview && previewProjects.length > 0 && !openInlineProject && (
            <ProjectPreview
              projects={previewProjects}
              selectedIndex={previewIndex}
              onSelectProject={setPreviewIndex}
              inline
            />
          )}

          <NeonButton
            variant="ghost"
            accent="cyan"
            iconLeft={<FiArrowLeft />}
            onClick={onBackToChat}
          >
            BACK TO CHAT
          </NeonButton>
        </div>
      )}

      {formState === 'error' && (
        <div className="space-y-4">
          <HudPanel accent="red" notch="sm" className="p-3 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-neon-red flex-shrink-0" />
            <span className="font-body text-sm text-neon-red">
              {errorMsg || 'Something went wrong.'}
            </span>
          </HudPanel>
          <div className="flex gap-2">
            <NeonButton
              accent="yellow"
              onClick={() => {
                setFormState('filling');
                setErrorMsg('');
              }}
            >
              TRY AGAIN
            </NeonButton>
            <NeonButton variant="ghost" accent="cyan" onClick={onBackToChat}>
              CANCEL
            </NeonButton>
          </div>
        </div>
      )}
    </div>
  );
}