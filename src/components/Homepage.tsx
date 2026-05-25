import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../../config.json';
import {
  FiSend,
  FiUser,
  FiCode,
  FiBriefcase,
  FiGithub,
  FiRotateCcw,
  FiSettings,
  FiStar,
} from 'react-icons/fi';
import {
  getPortfolioProfile,
  PortfolioProfile,
  getPortfolioProjects,
  PortfolioProject,
} from '../utils/api';
import SEOMeta from './SEOMeta';
import ChatMessage from './ChatMessage';
import MessageOverlay from './MessageOverlay';
import ErrorBoundary from './ErrorBoundary';

type Message = {
  role: 'user' | 'model';
  text: string;
};

const SUGGESTIONS = [
  { label: 'What are your core skills?', icon: <FiCode /> },
  { label: 'Tell me about your recent projects.', icon: <FiBriefcase /> },
  { label: 'Where can I find your GitHub?', icon: <FiGithub /> },
  { label: 'What is your professional background?', icon: <FiUser /> },
];

const premiumCardColors = [
  { gradient: 'from-purple-600/20 to-violet-800/20', border: 'border-purple-500/30', text: 'text-purple-200', icon: 'text-purple-400', glow: 'hover:shadow-purple-500/20' },
  { gradient: 'from-cyan-600/20 to-blue-800/20', border: 'border-cyan-500/30', text: 'text-cyan-200', icon: 'text-cyan-400', glow: 'hover:shadow-cyan-500/20' },
  { gradient: 'from-pink-600/20 to-rose-800/20', border: 'border-pink-500/30', text: 'text-pink-200', icon: 'text-pink-400', glow: 'hover:shadow-pink-500/20' },
  { gradient: 'from-lime-600/20 to-emerald-800/20', border: 'border-lime-500/30', text: 'text-lime-200', icon: 'text-lime-400', glow: 'hover:shadow-lime-500/20' },
  { gradient: 'from-orange-600/20 to-amber-800/20', border: 'border-orange-500/30', text: 'text-orange-200', icon: 'text-orange-400', glow: 'hover:shadow-orange-500/20' },
  { gradient: 'from-yellow-600/20 to-amber-800/20', border: 'border-yellow-500/30', text: 'text-yellow-200', icon: 'text-yellow-400', glow: 'hover:shadow-yellow-500/20' },
];

const getColor = (index: number) => premiumCardColors[index % premiumCardColors.length];

export default function Homepage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [detailProject, setDetailProject] = useState<PortfolioProject | null>(
    null,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      const [profileData, projectsData] = await Promise.all([
        getPortfolioProfile(),
        getPortfolioProjects(),
      ]);
      if (profileData) setProfile(profileData);
      setProjects(projectsData);
      setIsDataLoading(false);
    };
    loadData();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100,
      );
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setInput('');
    const userMessage: Message = { role: 'user', text };
    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await axios.post('/api/chat', { messages: updatedMessages });
      const replyText =
        res.data?.text || "I'm sorry, I couldn't reach the server right now.";
      setMessages((prev) => [...prev, { role: 'model', text: replyText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Oops! Something went wrong while fetching the answer.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setShowProjectDetail(false);
    setDetailProject(null);
  };

  const handleOpenOverlay = () => {
    setShowOverlay(true);
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
  };

  const isInitialState = messages.length === 0 && !showProjectDetail;

  // Loading skeleton for initial state
  const renderSkeleton = () => (
    <div className="flex flex-col items-center w-full animate-fade-in-up">
      <div className="mb-6">
        <div className="w-32 h-32 rounded-full skeleton-pulse" />
      </div>
      <div
        className="skeleton-line skeleton-line-lg mb-3"
        style={{ maxWidth: 300 }}
      />
      <div
        className="skeleton-line skeleton-line-md mb-6"
        style={{ maxWidth: 200 }}
      />
      <div
        className="skeleton-line skeleton-line-md mb-10"
        style={{ maxWidth: 400 }}
      />
      <div className="skeleton-grid w-full max-w-3xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card p-4">
            <div className="skeleton-line skeleton-line-md mb-2" />
            <div className="skeleton-line skeleton-line-sm" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col font-sans text-white relative overflow-hidden">
      <SEOMeta
        title={profile?.full_name || config.name || 'Fahim Ahmed'}
        description={
          profile?.bio || 'Portfolio of Fahim Ahmed - Full-Stack Developer'
        }
        image={profile?.avatar_url}
        path="/"
      />

      {/* Premium Animated Background */}
      <div className="animated-bg-mesh" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <div className="animated-grid" aria-hidden="true" />
      <div className="gradient-orb gradient-orb-1" aria-hidden="true" />
      <div className="gradient-orb gradient-orb-2" aria-hidden="true" />
      <div className="gradient-orb gradient-orb-3" aria-hidden="true" />
      <div className="gradient-orb gradient-orb-4" aria-hidden="true" />

      {/* Particle Layer */}
      <div className="particle-container" aria-hidden="true">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
      </div>

      {/* Top Bar */}
      <nav
        className="w-full flex justify-between items-center p-4 z-10 relative"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400">
            {profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Portfolio` : 'AI Assistant'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isInitialState && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 bg-[#1E293B]/80 hover:bg-[#334155] border border-gray-700 hover:border-gray-600 transition-all rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm"
              title="Reset chat"
            >
              <FiRotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col items-center z-10 px-4 w-full max-w-4xl mx-auto transition-all duration-700 ease-in-out ${
          showOverlay ? 'blur-behind active' : ''
        } ${
          isInitialState && !isDataLoading
            ? 'justify-center pb-[15vh]'
            : 'justify-end pb-6'
        }`}
      >
        {/* Initial Centered Content */}
        {isInitialState && !isDataLoading && (
          <div className="flex flex-col items-center animate-fade-in-up w-full">
            <div className="mb-6 relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500/40 shadow-2xl shadow-purple-500/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Fahim Ahmed'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {(profile?.full_name || 'FA').charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-purple-400/40 scale-110 animate-pulse"></div>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 text-center tracking-tight text-white">
              {profile?.full_name || 'FAHIM AHMED'}
            </h1>

            {profile?.title && (
              <p className="text-lg md:text-xl text-blue-400 text-center mb-6 font-medium">
                {profile.title}
              </p>
            )}

            <p className="text-base md:text-lg text-gray-400 text-center mb-10 max-w-lg">
              {profile?.bio || ''}
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-8 w-full max-w-3xl">
              {SUGGESTIONS.map((suggestion, idx) => {
                const colors = getColor(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion.label)}
                    className={`premium-card flex items-center gap-3 px-5 py-3.5 bg-gradient-to-br ${colors.gradient} border ${colors.border} ${colors.text} rounded-xl text-sm font-medium backdrop-blur-sm hover:border-opacity-60 ${colors.glow} group`}
                  >
                    <span className={`${colors.icon} group-hover:scale-110 transition-transform`}>{suggestion.icon}</span>
                    {suggestion.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Data loading skeleton */}
        {isInitialState && isDataLoading && renderSkeleton()}

        {/* Chat Messages Area */}
        {!isInitialState && (
          <ErrorBoundary
            fallback={
              <div className="w-full p-6 text-center">
                <p className="text-gray-400 text-sm">Chat area encountered an error. <button onClick={() => window.location.reload()} className="text-blue-400 hover:underline">Reload page</button></p>
              </div>
            }
          >
            <div
              className="w-full flex-1 overflow-y-auto mb-4 pr-2"
              role="log"
              aria-label="Chat conversation"
              aria-live="polite"
            >
              <div className="flex flex-col gap-4 py-4">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    text={msg.text}
                    projects={projects}
                  />
                ))}
                {isLoading && (
                  <div className="flex w-full justify-start">
                    <div className="px-4 py-3 bg-[#1E293B] border border-gray-700 rounded-lg rounded-bl-md shadow-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* Quick Project Cards */}
        {!isInitialState && projects.length > 0 && (
          <div className="w-full mb-4">
            <div className="flex flex-wrap justify-center gap-3">
              {projects.slice(0, 4).map((project, idx) => {
                const colors = getColor(idx + 3);
                return (
                  <button
                    key={project.id}
                    onClick={() => { setDetailProject(project); setShowProjectDetail(true); }}
                    className={`premium-card flex flex-col items-center p-3 rounded-xl border ${colors.border} bg-gradient-to-br ${colors.gradient} w-[140px]`}
                  >
                    <div className="w-full h-16 rounded-lg overflow-hidden mb-2 bg-black/30">
                      {project.thumbnail_url ? (
                        <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiStar className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold text-center leading-tight ${colors.text}`}>{project.short_title || project.title}</span>
                    <div className="flex flex-wrap gap-0.5 mt-1.5 justify-center">
                      {project.languages?.slice(0, 2).map((lang, li) => (
                        <span key={li} className={`text-[7px] px-1.5 py-0.5 rounded-full bg-white/5 border ${colors.border} ${colors.text}`}>{lang}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project Detail View */}
        {showProjectDetail && detailProject && (
          <div className="w-full mb-4 animate-fade-in-up">
            <div className="bg-[#0F172A]/80 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                  {detailProject.thumbnail_url ? (
                    <img
                      src={detailProject.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <FiBriefcase className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold">
                    {detailProject.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {detailProject.languages?.map((lang, li) => {
                      const lc = getColor(li);
                      return (
                        <span
                          key={li}
                          className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-br ${lc.gradient} ${lc.text} border ${lc.border}`}
                        >
                          {lang}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowProjectDetail(false);
                    setDetailProject(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#1E293B] text-gray-500 hover:text-white transition-all"
                >
                  <span className="text-lg">&times;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Input Bar - Always Visible */}
        <div className="w-full relative group flex-shrink-0 premium-input-wrapper">
          <div className="input-glow absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-500 rounded-2xl" aria-hidden="true" />
          <div className="relative bg-[#0F172A]/80 border border-gray-700/50 rounded-2xl shadow-2xl flex items-center p-2 backdrop-blur-lg focus-within:border-purple-500/40 focus-within:shadow-[0_0_30px_rgba(139,92,246,0.1)] transition-all duration-300 cursor-text" onClick={handleOpenOverlay}>
            <input
              type="text"
              className="main-chat-input flex-1 bg-transparent border-none text-white px-4 py-3.5 focus:outline-none placeholder-gray-500 text-base cursor-text"
              placeholder="Ask anything about my work..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleOpenOverlay}
              disabled={isLoading}
              aria-label="Type your message"
              readOnly
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(input); }}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-1 shadow-lg flex items-center justify-center"
              aria-label="Send message"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Message Overlay */}
      <MessageOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        inputValue={input}
        onInputChange={setInput}
        onSend={(text) => {
          handleSend(text);
          handleCloseOverlay();
        }}
        isLoading={isLoading}
        suggestions={SUGGESTIONS}
        onSuggestionClick={(label) => {
          handleSend(label);
          handleCloseOverlay();
        }}
        projects={projects}
      />
    </div>
  );
}
