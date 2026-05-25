import React, { useState } from 'react';
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

type ProjectMatchFormProps = {
  onBackToChat: () => void;
  projects: PortfolioProject[];
};

type FormState = 'filling' | 'submitting' | 'result' | 'error';

export default function ProjectMatchForm({
  onBackToChat,
  projects,
}: ProjectMatchFormProps) {
  const [formState, setFormState] = useState<FormState>('filling');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<string>('');
  const [segments, setSegments] = useState<ParsedSegment[]>([]);
  const [previewProjects, setPreviewProjects] = useState<PortfolioProject[]>(
    [],
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [openInlineProject, setOpenInlineProject] =
    useState<PortfolioProject | null>(null);

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

      // Parse markers from response
      const parsedSegments = parseAiResponse(responseText);
      setSegments(parsedSegments);

      // Auto-show preview for list/single markers
      const listSegments = parsedSegments.filter(
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
    } catch (err: any) {
      setFormState('error');
      setErrorMsg(
        err.response?.data?.message || 'Failed to analyze. Please try again.',
      );
    }
  };

  // Handle inline ref clicks
  const handleInlineRefOpen = (project: PortfolioProject) => {
    if (openInlineProject?.id === project.id) {
      setOpenInlineProject(null);
    } else {
      setOpenInlineProject(project);
    }
  };

  return (
    <div className="space-y-3 animate-fade-in-scale">
      {formState === 'filling' && (
        <>
          <div className="flex items-start gap-3 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <FiSearch className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-lime-300 text-sm font-medium">
                Project Match
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Describe your project idea and I&apos;ll check my portfolio for
                similar work I&apos;ve done.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm">{errorMsg}</span>
            </div>
          )}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project idea in detail...&#10;&#10;For example: I want to build a real-time chat application with WebSockets, user authentication, and message persistence. The frontend should use React and the backend should be in Node.js with PostgreSQL."
            maxLength={5000}
            rows={6}
            className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
          />
          <div className="flex justify-end">
            <span className="text-[10px] text-gray-600">
              {description.length}/5000
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || description.trim().length < 20}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-lime-600 to-emerald-500 hover:from-lime-500 hover:to-emerald-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSearch className="w-4 h-4" />
              Check Portfolio
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="px-4 py-2.5 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl text-sm hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {formState === 'submitting' && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-lime-500 rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lime-300 font-medium">
              Analyzing your project...
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Checking my portfolio for similar work
            </p>
          </div>
        </div>
      )}

      {formState === 'result' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <FiCheck className="w-5 h-5 text-lime-300 flex-shrink-0" />
            <span className="text-lime-300 text-sm font-medium">
              Analysis Complete
            </span>
          </div>

          {/* Result with parsed inline refs */}
          <div className="bg-[#0F172A]/80 border border-gray-700/50 rounded-lg p-4 text-gray-300 text-sm leading-relaxed space-y-2">
            {segments.map((segment, idx) => {
              switch (segment.type) {
                case 'text':
                  return (
                    <p key={idx}>
                      {segment.content.split('\n').map((line, li) => (
                        <React.Fragment key={li}>
                          {line}
                          {li < segment.content.split('\n').length - 1 && (
                            <br />
                          )}
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

          {/* Inline ref preview */}
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

          {/* Auto list/single preview */}
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

          <button
            onClick={onBackToChat}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-lime-600 to-emerald-500 hover:from-lime-500 hover:to-emerald-400 text-white rounded-lg text-sm transition-all"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>
        </div>
      )}

      {formState === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">
              {errorMsg || 'Something went wrong.'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormState('filling');
                setErrorMsg('');
              }}
              className="px-4 py-2 bg-gradient-to-r from-lime-600 to-emerald-500 hover:from-lime-500 hover:to-emerald-400 text-white rounded-lg text-sm transition-all"
            >
              Try Again
            </button>
            <button
              onClick={onBackToChat}
              className="px-4 py-2 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl text-sm hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
