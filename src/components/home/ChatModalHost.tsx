import React from 'react';
import { PortfolioProject, PortfolioSkill } from '../../utils/api';
import ChatInputBar from './ChatInputBar';
import MessageOverlay from '../MessageOverlay';
import { Code, Briefcase, User } from 'lucide-react';

const SUGGESTIONS = [
  {
    label: 'What are your core skills?',
    icon: <Code size={16} />,
    match: ['skills', 'tech'],
  },
  {
    label: 'Tell me about your recent projects.',
    icon: <Briefcase size={16} />,
    match: ['projects', 'work'],
  },
  {
    label: 'Where can I find your GitHub?',
    icon: <Code size={16} />,
    match: ['github', 'code'],
  },
  {
    label: 'What is your professional background?',
    icon: <User size={16} />,
    match: ['about', 'bio'],
  },
];

type Props = {
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string, skillFilter?: number[]) => void;
  onReset: () => void;
  showClear: boolean;
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  isLoading: boolean;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  conversationHistory: string[];
};

export default function ChatModalHost({
  input,
  setInput,
  onSend,
  onReset,
  showClear,
  showOverlay,
  setShowOverlay,
  isLoading,
  projects,
  skills,
  conversationHistory,
}: Props) {
  return (
    <>
      <ChatInputBar
        input={input}
        onInputChange={setInput}
        onSend={() => onSend(input)}
        onOpen={() => setShowOverlay(true)}
        onReset={onReset}
        showClear={showClear}
      />
      <MessageOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        inputValue={input}
        onInputChange={setInput}
        onSend={(text, skillFilter) => {
          onSend(text, skillFilter);
          setShowOverlay(false);
        }}
        isLoading={isLoading}
        suggestions={SUGGESTIONS}
        onSuggestionClick={(label) => {
          onSend(label);
          setShowOverlay(false);
        }}
        projects={projects}
        skills={skills}
        conversationHistory={conversationHistory}
        useEnhancedSuggestions
      />
    </>
  );
}
