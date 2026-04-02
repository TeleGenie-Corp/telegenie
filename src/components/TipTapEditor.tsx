import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { Mark, mergeAttributes } from '@tiptap/core';
import React, { useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, RotateCcw, X, Underline as UnderlineIcon, Quote, EyeOff, Copy } from 'lucide-react';

// Custom Spoiler Mark
const Spoiler = Mark.create({
  name: 'spoiler',
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
  parseHTML() {
    return [
      { tag: 'span.tg-spoiler' },
      { tag: 'tg-spoiler' },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'tg-spoiler' }, HTMLAttributes), 0]
  },
  addCommands() {
    return {
      toggleSpoiler: () => ({ commands }: { commands: any }) => {
        return commands.toggleMark(this.name)
      },
    } as any
  },
})

interface TipTapEditorProps {
  value: string;
  rawText?: string;
  onChange: (text: string) => void;
}

/**
 * Converts Telegram HTML (newline-separated) to TipTap HTML (paragraph-wrapped).
 * Only transforms if no <p> tags are present — avoids double-conversion.
 */
function telegramToTiptap(html: string): string {
  if (!html || html.includes('<p>')) return html;
  const lines = html.split('\n');
  return lines
    .map(line => (line.trim().length === 0 ? '<p></p>' : `<p>${line}</p>`))
    .join('');
}

export function TipTapEditor({ value, rawText, onChange }: TipTapEditorProps) {
  const editCountRef = useRef(0);
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackManualEdit = useCallback(() => {
    editCountRef.current += 1;
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    editDebounceRef.current = setTimeout(() => {
      import('../../services/analyticsService').then(({ AnalyticsService }) => {
        AnalyticsService.trackPostEditedManual(editCountRef.current);
      });
    }, 2000);
  }, []);

  const handleCopyPost = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const { AnalyticsService } = await import('../../services/analyticsService');
      AnalyticsService.trackCopyPost(text.length);
    } catch { /* clipboard denied */ }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Spoiler,
      CharacterCount.configure({
        limit: 4096,
      }),
    ],
    content: telegramToTiptap(value),
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-[300px] h-full px-4 py-3 text-slate-900 whitespace-pre-wrap',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      trackManualEdit();
    },
  });

  // Sync external value changes (e.g. from AI edit / undo)
  useEffect(() => {
    if (!editor || editor.isFocused || typeof value !== 'string') return;
    const content = telegramToTiptap(value);
    if (editor.getHTML() !== content) {
      const currentLength = editor.getText().length;
      if (currentLength === 0 || Math.abs(currentLength - editor.getText().length) > 5) {
        editor.commands.setContent(content);
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const chars = editor.storage.characterCount.characters();
  const CAPTION_LIMIT = 1024;
  const TEXT_LIMIT = 4096;

  return (
    <div className="bg-white overflow-hidden relative z-10 h-full flex flex-col">
      <style>{`
        /* Custom Editor Styles */
        .prose code {
          color: #7c3aed !important;
          background-color: #f5f3ff !important;
          padding: 0.125rem 0.35rem !important;
          border-radius: 0.375rem !important;
          font-weight: 500 !important;
          font-family: 'JetBrains Mono', monospace !important; 
        }
        .prose code::before, .prose code::after {
          content: "" !important;
        }
        
        .tg-spoiler {
          background-color: #e2e8f0;
          color: transparent;
          text-shadow: 0 0 5px rgba(0,0,0,0.5);
          border-radius: 4px;
          cursor: help;
          transition: all 0.2s;
          padding: 0 2px;
        }
        .tg-spoiler:hover, .tg-spoiler.is-active {
            background-color: transparent;
            color: inherit;
            text-shadow: none;
            background-image: linear-gradient(45deg, #f1f5f9 25%, #e2e8f0 25%, #e2e8f0 50%, #f1f5f9 50%, #f1f5f9 75%, #e2e8f0 75%, #e2e8f0 100%);
            background-size: 10px 10px;
        }

        .prose blockquote {
            border-left-color: #7c3aed !important;
            background: #f8fafc;
            padding: 0.5rem 1rem;
            border-radius: 0 0.5rem 0.5rem 0;
            font-style: normal !important;
            color: #475569 !important;
        }
        .prose blockquote p:first-of-type::before, .prose blockquote p:last-of-type::after {
            content: none !important;
        }

        /* Links */
        .prose a {
            color: #7c3aed !important;
            text-decoration: underline !important;
            text-underline-offset: 2px;
        }
        .prose a:hover {
            color: #6d28d9 !important;
        }

        /* Enforce Paragraph Spacing */
        .prose p {
            margin-top: 0.5em !important;
            margin-bottom: 0.5em !important;
            line-height: 1.6;
            min-height: 1.6em; /* Ensure empty paragraphs have height */
        }
        
        /* Show ProseMirror internal breaks - essential for empty lines */
        /* .prose .ProseMirror-trailingBreak { display: block; } */
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center px-2 py-1.5 gap-0.5 overflow-x-auto border-b border-slate-100/80">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<Bold size={14} />}
          tooltip="Bold (Cmd+B)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<Italic size={14} />}
          tooltip="Italic (Cmd+I)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          icon={<UnderlineIcon size={14} />}
          tooltip="Underline (Cmd+U)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          icon={<Strikethrough size={14} />}
          tooltip="Strikethrough"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          icon={<Code size={14} />}
          tooltip="Code"
        />
        <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={<Quote size={14} />}
          tooltip="Quote"
        />
        <ToolbarButton
          // @ts-ignore
          onClick={() => editor.chain().focus().toggleSpoiler().run()}
          isActive={editor.isActive('spoiler')}
          icon={<EyeOff size={14} />}
          tooltip="Spoiler"
        />
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          icon={<LinkIcon size={14} />}
          tooltip="Link"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          isActive={false}
          icon={<X size={14} className="text-red-500" />}
          tooltip="Clear"
        />
        <div className="flex-1" />
        <button
          onClick={() => rawText && onChange(rawText)}
          disabled={!rawText}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 shrink-0"
          title="Сбросить"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={() => editor && handleCopyPost(editor.getText())}
          className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
          title="Копировать"
        >
          <Copy size={13} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="prose-container flex-1 overflow-y-auto relative">
        <EditorContent editor={editor} className="h-full" />
      </div>
      
      {/* Character Count - Fixed at bottom */}
      <div className={`absolute bottom-3 right-4 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md border z-10 ${
        chars > TEXT_LIMIT
          ? 'bg-red-50 text-red-600 border-red-100'
          : chars > CAPTION_LIMIT
            ? 'bg-amber-50 text-amber-600 border-amber-100'
            : 'bg-slate-100/80 text-slate-400 border-slate-200'
      }`}>
        {chars} / {TEXT_LIMIT}
        {chars > CAPTION_LIMIT && chars <= TEXT_LIMIT && (
          <span className="ml-1 normal-case tracking-normal font-medium">· caption {CAPTION_LIMIT}</span>
        )}
      </div>

    </div>
  );
}

const ToolbarButton = ({ onClick, isActive, icon, tooltip }: any) => (
  <button
    onClick={onClick}
    title={tooltip}
    className={`p-1.5 rounded-md transition-all shrink-0 ${
      isActive
        ? 'bg-violet-600 text-white shadow-sm'
        : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'
    }`}
  >
    {icon}
  </button>
);
