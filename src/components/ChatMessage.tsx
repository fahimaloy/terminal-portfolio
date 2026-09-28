// src/components/ChatMessage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RiAlertLine, RiRefreshLine } from 'react-icons/ri';
import {
  PortfolioProject,
  PortfolioSkill,
  PortfolioExperience,
} from '../utils/api';
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
import ProjectMatchGrid from './ProjectMatchGrid';
import ProjectDetailDrawer from './ProjectDetailDrawer';
import InlineProjectCard from './InlineProjectCard';
import SkillCard from './SkillCard';
import SkillGrid from './SkillGrid';
import ExperienceTimeline from './ExperienceTimeline';
import RichTextRenderer from './RichTextRenderer';
import { HudPanel, MentionChip, TypewriterText } from './ui';

type ChatMessageProps = {
  role: 'user' | 'model';
  text: string;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences?: PortfolioExperience[];
  responseType?: string;
  responseData?: any;
  /** Epoch ms the message was appended. Drives the metadata rail. */
  ts?: number;
  /** A failed request — rendered as a distinct error card, not an answer. */
  isError?: boolean;
  /** Re-runs the last request. Only offered on error bubbles. */
  onRetry?: () => void;
  /**
   * P3.3: whether this message should play the typewriter reveal. Defaults to
   * `true` so every other caller keeps its behaviour; `ChatStream` is the only
   * consumer that passes it, and it passes `false` for everything that is not
   * the newly-arrived assistant reply. That is what stops a restored
   * transcript from replaying every old message's fade on mount.
   */
  reveal?: boolean;
  /**
   * P3.3: the reveal has finished and the full text is now the settled answer —
   * the only moment at which it is safe to announce it. Fired immediately for
   * reduced-motion users, who get the whole text with no animation at all.
   */
  onRevealDone?: () => void;
};

/**
 * Metadata rail shared by every bubble. The dot + label carry the role, the
 * clock carries the time — one consistent row instead of a bare `> AI.RESPONSE`
 * string, so scanning a long transcript tells you who said what and when.
 *
 * The label is a real element rather than a `::before` because it has to be
 * selectable, translatable and readable by assistive tech.
 */
function RoleRail({
  accent,
  label,
  ts,
}: {
  accent: 'cyan' | 'amber' | 'coral';
  label: string;
  ts?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-2 select-none">
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: `var(--neon-${accent})`,
          boxShadow: `0 0 8px var(--glow-${accent}-sm)`,
        }}
      />
      <span
        className="font-mono text-[10px] tracking-[0.2em] uppercase leading-none"
        style={{ color: `var(--neon-${accent})` }}
      >
        {label}
      </span>
      {ts != null && (
        <time
          dateTime={new Date(ts).toISOString()}
          className="font-mono text-[10px] tabular-nums ml-auto leading-none"
          style={{ color: 'var(--fg-3)' }}
        >
          {formatClock(ts)}
        </time>
      )}
    </div>
  );
}

/**
 * `HH:MM` in 24h. Formatted by hand rather than through `toLocaleTimeString`
 * so the server and the client cannot disagree over a locale or a 12/24h
 * default — that mismatch is a hydration error, and this rail renders inside
 * the logged conversation region.
 */
function formatClock(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default React.memo(function ChatMessage({
  role,
  text,
  projects,
  skills,
  experiences = [],
  responseType,
  responseData,
  ts,
  isError = false,
  onRetry,
  reveal = true,
  onRevealDone,
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
  }, [text, reveal]);

  // `reveal` false means this message is history: render it flat, with no
  // typewriter mounted at all. Reduced motion is NOT handled here — `ChatStream`
  // is the single owner of that decision and reads it through the render-safe
  // `useMotionPreference` hook, so it simply passes `reveal={false}` and this
  // component never needs to know why.
  const shouldType = reveal && !typedDone;

  // P3.3 — a marker-bearing answer renders one <TypewriterText> per text
  // segment, each with its own onComplete. "Settled" has to mean ALL of them
  // finished, so this counts down rather than latching on the first callback
  // (which previously swapped the remaining mid-reveal segments straight to
  // their final text, so a card with prose after a project grid skipped it).
  const textSegmentCount = hasMarkers
    ? segments.filter((s) => s.type === 'text').length
    : 1;
  const pendingRef = useRef(textSegmentCount);

  const markSegmentDone = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    if (pendingRef.current === 0) {
      setTypedDone(true);
      onRevealDone?.();
    }
  }, [onRevealDone]);

  // Re-arm the countdown whenever the text or the reveal decision changes, and
  // settle immediately when there is nothing to reveal (a card with no text
  // segment at all), so the stream's settled flag can never latch.
  useEffect(() => {
    pendingRef.current = textSegmentCount;
    if (textSegmentCount === 0) {
      setTypedDone(true);
      onRevealDone?.();
    }
  }, [text, reveal, textSegmentCount, onRevealDone]);

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <HudPanel
          accent="amber"
          className="max-w-[85%] md:max-w-[75%] px-4 py-3 accent-hairline"
        >
          <RoleRail accent="amber" label="You" ts={ts} />
          <div className="font-body text-sm text-text-primary whitespace-pre-wrap break-words">
            {text}
          </div>
        </HudPanel>
      </div>
    );
  }

  // A failed request used to arrive as an ordinary `model` message, so a failed
  // API call was visually indistinguishable from a real answer — the reader
  // had to read the prose to notice. It gets its own card and a retry.
  if (isError) {
    return (
      <div className="flex w-full justify-start">
        <div
          role="alert"
          className="w-full max-w-[95%] md:max-w-[75%] rounded-card px-4 py-3 border"
          style={{
            background: 'var(--wash-coral)',
            borderColor: 'var(--glow-coral)',
          }}
        >
          <div className="flex items-center gap-2 mb-2 select-none">
            <RiAlertLine
              size={14}
              aria-hidden="true"
              style={{ color: 'var(--neon-coral)' }}
            />
            <span
              className="font-mono text-[10px] tracking-[0.2em] uppercase leading-none"
              style={{ color: 'var(--neon-coral)' }}
            >
              Connection Error
            </span>
            {ts != null && (
              <time
                dateTime={new Date(ts).toISOString()}
                className="font-mono text-[10px] tabular-nums ml-auto leading-none"
                style={{ color: 'var(--fg-3)' }}
              >
                {formatClock(ts)}
              </time>
            )}
          </div>
          <p
            className="font-body text-sm leading-relaxed"
            style={{ color: 'var(--fg-2)' }}
          >
            {text}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 rounded-[var(--radius-md)] font-mono text-[11px] tracking-[0.14em] uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-coral)]"
              style={{
                background: 'var(--wash-coral-strong)',
                border: '1px solid var(--glow-coral)',
                color: 'var(--neon-coral)',
              }}
            >
              <RiRefreshLine size={12} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // RAG response types - render custom components
  if (responseType === 'project_table' && responseData?.projects) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-[95%] md:max-w-[85%]">
          <HudPanel accent="cyan" className="px-4 py-3 accent-hairline">
            <RoleRail accent="cyan" label="Assistant" ts={ts} />
            <ProjectMatchGrid
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
          <HudPanel accent="cyan" className="px-4 py-3 accent-hairline">
            <RoleRail accent="cyan" label="Assistant" ts={ts} />
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
          <HudPanel accent="cyan" className="px-4 py-3 accent-hairline">
            <RoleRail accent="cyan" label="Assistant" ts={ts} />
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
          className="max-w-[85%] md:max-w-[75%] px-4 py-3 accent-hairline"
        >
          <RoleRail accent="cyan" label="Assistant" ts={ts} />
          <div className="font-body text-sm text-text-primary whitespace-pre-wrap">
            {shouldType ? (
              <TypewriterText text={text} onDone={markSegmentDone} />
            ) : (
              text
            )}
          </div>
        </HudPanel>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[90%] md:max-w-[82%] space-y-3">
        <HudPanel accent="cyan" className="px-4 py-3 accent-hairline">
          <RoleRail accent="cyan" label="Assistant" ts={ts} />
          <div className="font-body text-sm text-text-primary space-y-3">
            {segments.map((segment, idx) => {
              switch (segment.type) {
                case 'text':
                  return (
                    <span key={idx} className="block whitespace-pre-wrap">
                      {shouldType ? (
                        <TypewriterText
                          text={segment.content}
                          onDone={markSegmentDone}
                        />
                      ) : (
                        segment.content
                      )}
                    </span>
                  );
                case 'project_ref': {
                  const proj = findProjectById(projects, segment.id);
                  if (!proj) return null;
                  return (
                    <MentionChip
                      tag={proj.title || String(proj.id)}
                      wash="cyan"
                    >
                      <InlineProjectCard
                        project={proj}
                        skills={skills}
                        onClick={() => {
                          setModalProjects([proj]);
                          setShowModal(true);
                        }}
                      />
                    </MentionChip>
                  );
                }
                case 'skill_ref': {
                  const skill = findSkillById(skills, segment.id);
                  if (!skill) return null;
                  return (
                    <MentionChip
                      tag={String(skill.name || skill.id)}
                      wash="cyan"
                    >
                      <SkillCard skill={skill} inline />
                    </MentionChip>
                  );
                }
                case 'skill_list': {
                  const skillList = findSkillsByIds(skills, segment.ids);
                  return <SkillGrid key={idx} skills={skillList} />;
                }
                case 'experience_timeline':
                  return (
                    <ExperienceTimeline key={idx} experiences={experiences} />
                  );
                case 'project_table':
                  return (
                    <ProjectMatchGrid
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

      <ProjectDetailDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        projects={modalProjects}
        skills={skills}
      />
    </div>
  );
});
