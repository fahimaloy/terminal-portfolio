'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  RemoveFormatting,
  Maximize2,
  Minimize2,
  Hash,
} from 'lucide-react';
import { animate } from 'animejs';
import { isReducedMotion } from '../../config/animations';
import AnimatedCounter from '../ui/AnimatedCounter';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const LANGS = [
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
  'css',
  'html',
  'sql',
  'bash',
  'json',
  'yaml',
  'markdown',
  'jsx',
  'tsx',
];

function MenuButton({
  icon,
  action,
  active,
  title,
  disabled,
}: {
  icon: React.ReactNode;
  action: () => void;
  active: boolean;
  title: string;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    action();
    if (ref.current && !isReducedMotion()) {
      animate(ref.current, {
        scale: [1, 0.9, 1.05, 1],
        duration: 200,
        ease: 'outExpo',
      });
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`p-1.5 clip-notch-sm transition-all duration-150 focus-visible:outline-none focus-visible:border focus-visible:border-neon-cyan focus-visible:shadow-[0_0_12px_var(--glow-cyan-sm)] ${
        active
          ? 'bg-neon-purple/25 text-neon-purple border border-neon-purple/30'
          : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04] border border-transparent'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      title={title}
    >
      {icon}
    </button>
  );
}

const MenuBar = ({
  editor,
  isFullscreen,
  onToggleFullscreen,
}: {
  editor: any;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) => {
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [activeLang, setActiveLang] = useState('javascript');

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const setCodeLang = (lang: string) => {
    setActiveLang(lang);
    if (editor.isActive('codeBlock')) {
      editor.chain().focus().setCodeBlock({ language: lang }).run();
    } else {
      editor.chain().focus().toggleCodeBlock({ language: lang }).run();
    }
    setLangPickerOpen(false);
  };

  const buttons: Array<
    | {
        icon: React.ReactNode;
        action: () => void;
        active: boolean;
        title: string;
        disabled?: boolean;
      }
    | { divider: true }
  > = [
    {
      icon: <Bold size={14} />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
      title: 'Bold',
    },
    {
      icon: <Italic size={14} />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      title: 'Italic',
    },
    {
      icon: <UnderlineIcon size={14} />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive('underline'),
      title: 'Underline',
    },
    {
      icon: <Strikethrough size={14} />,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike'),
      title: 'Strikethrough',
    },
    {
      icon: <Code size={14} />,
      action: () => editor.chain().focus().toggleCode().run(),
      active: editor.isActive('code'),
      title: 'Inline Code',
    },
    { divider: true },
    {
      icon: <List size={14} />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
      title: 'Bullet List',
    },
    {
      icon: <ListOrdered size={14} />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      title: 'Ordered List',
    },
    { divider: true },
    {
      icon: <AlignLeft size={14} />,
      action: () => editor.chain().focus().setTextAlign('left').run(),
      active: editor.isActive({ textAlign: 'left' }),
      title: 'Align Left',
    },
    {
      icon: <AlignCenter size={14} />,
      action: () => editor.chain().focus().setTextAlign('center').run(),
      active: editor.isActive({ textAlign: 'center' }),
      title: 'Align Center',
    },
    {
      icon: <AlignRight size={14} />,
      action: () => editor.chain().focus().setTextAlign('right').run(),
      active: editor.isActive({ textAlign: 'right' }),
      title: 'Align Right',
    },
    { divider: true },
    {
      icon: <LinkIcon size={14} />,
      action: addLink,
      active: editor.isActive('link'),
      title: 'Add Link',
    },
    {
      icon: <ImageIcon size={14} />,
      action: addImage,
      active: false,
      title: 'Add Image',
    },
    {
      icon: <TableIcon size={14} />,
      action: addTable,
      active: editor.isActive('table'),
      title: 'Add Table',
    },
    { divider: true },
    {
      icon: <RemoveFormatting size={14} />,
      action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
      active: false,
      title: 'Clear Formatting',
    },
    {
      icon: <Undo size={14} />,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      disabled: !editor.can().undo(),
      title: 'Undo',
    },
    {
      icon: <Redo size={14} />,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      disabled: !editor.can().redo(),
      title: 'Redo',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-white/[0.03] relative">
      {buttons.map((btn, i) => {
        if ('divider' in btn) {
          return <div key={i} className="w-px h-6 bg-white/10 mx-1" />;
        }
        return (
          <MenuButton
            key={i}
            icon={btn.icon}
            action={btn.action}
            active={btn.active}
            title={btn.title}
            disabled={btn.disabled}
          />
        );
      })}

      {/* Code block language selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setLangPickerOpen(!langPickerOpen)}
          className={`p-1.5 clip-notch-sm transition-all flex items-center gap-1 text-xs focus-visible:outline-none focus-visible:border focus-visible:border-neon-cyan ${
            editor.isActive('codeBlock')
              ? 'bg-neon-purple/25 text-neon-purple border border-neon-purple/30'
              : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04] border border-transparent'
          }`}
          title="Code Block Language"
        >
          <Hash size={14} />
          <span className="text-[10px] uppercase">
            {editor.isActive('codeBlock') ? activeLang : 'code'}
          </span>
        </button>
        {langPickerOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-bg-smoke border border-white/10 clip-notch-sm p-2 max-h-48 overflow-y-auto min-w-[140px] shadow-xl">
            {LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setCodeLang(lang)}
                className={`block w-full text-left px-2 py-1 text-xs clip-notch-sm transition-colors focus-visible:outline-none focus-visible:border-neon-cyan ${
                  activeLang === lang
                    ? 'bg-neon-purple/15 text-neon-purple'
                    : 'text-text-secondary hover:bg-white/[0.04]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className="p-1.5 clip-notch-sm text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-all ml-auto focus-visible:outline-none focus-visible:border focus-visible:border-neon-cyan"
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      // Update word and char count
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    },
  });

  // Initial word count
  useEffect(() => {
    if (editor) {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    }
  }, [editor]);

  // Handle escape to exit fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  // Animate toolbar buttons stagger on mount
  useEffect(() => {
    if (containerRef.current && !isReducedMotion()) {
      const btns = containerRef.current.querySelectorAll('.toolbar-animate');
      animate(btns, {
        opacity: [0, 1],
        y: [-4, 0],
        duration: 200,
        ease: 'outExpo',
        delay: 30,
      });
    }
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={`border border-white/10 clip-notch-sm overflow-hidden bg-white/[0.03] ${
          isFullscreen
            ? 'fixed inset-4 z-50 flex flex-col shadow-2xl shadow-[0_0_24px_var(--glow-purple-sm)]'
            : ''
        }`}
      >
        <div className="toolbar-animate">
          <MenuBar
            editor={editor}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        </div>
        <EditorContent
          editor={editor}
          className={`prose prose-invert max-w-none p-3 focus:outline-none focus-visible:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:focus-visible:outline-none ${
            isFullscreen ? 'flex-1 min-h-0' : 'min-h-[150px]'
          } [&_.ProseMirror]:min-h-[130px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-text-muted [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]`}
          data-placeholder={placeholder || 'Write your description...'}
        />

        {/* Footer: word count */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-white/[0.03] text-xs text-text-muted">
          <div className="flex gap-4">
            <span>
              <AnimatedCounter value={wordCount} /> words
            </span>
            <span>{charCount} chars</span>
          </div>
          {isFullscreen && (
            <span className="text-[10px] text-text-muted">
              ESC to exit fullscreen
            </span>
          )}
        </div>
      </div>

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
