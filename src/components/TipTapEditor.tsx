import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { Mark, mergeAttributes } from '@tiptap/core';
import React, { useEffect } from 'react';
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, RotateCcw, X, Underline as UnderlineIcon, Quote, EyeOff } from 'lucide-react';

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

export function TipTapEditor({ value, rawText, onChange }: TipTapEditorProps) {
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
      Underline,
      Spoiler,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-violet-600 underline decoration-violet-300 underline-offset-2',
        },
      }),
      CharacterCount.configure({
        limit: 1024,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-[400px] h-full px-6 py-4 text-slate-900 whitespace-pre-wrap',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. from Polishing agent)
  useEffect(() => {
    if (editor && typeof value === 'string' && value !== editor.getHTML()) {
      // Check if value needs newline conversion (Telegram HTML -> Web HTML)
      // If value contains newlines but no paragraphs/breaks, it's likely raw text/Telegram HTML
      let content = value;
      if (value.includes('\n') && !value.includes('<p>') && !value.includes('<br')) {
         // Convert to paragraphs for better block control (Quote, Lists)
         // Split by single newline to create distinct blocks, preserving empty lines
         const paragraphs = value.split('\n');
         content = paragraphs.map(p => {
             // TipTap/ProseMirror will handle the break for empty paragraphs automatically
             return p.trim().length === 0 ? '<p></p>' : `<p>${p}</p>`;
         }).join('');
      }

      // Brute force check to prevent infinite loops, but allow external updates
      if (editor.getHTML() !== content) {
          // Only update if difference is significant or it's a fresh load (empty editor)
          const currentLength = editor.getText().length;
          const newLength = content.length; // Approximate
          
          if (currentLength === 0 || Math.abs(currentLength - newLength) > 5) {
             editor.commands.setContent(content);
          }
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

  const percentage = editor.storage.characterCount.characters() / 1024 * 100;
  const chars = editor.storage.characterCount.characters();

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
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex-wrap gap-y-2">
        <div className="flex items-center gap-1">
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
          
          <div className="w-px h-6 bg-slate-200 mx-1" />
          
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
            tooltip="Spoiler (Hidden Text)"
          />

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <ToolbarButton 
            onClick={setLink} 
            isActive={editor.isActive('link')}
            icon={<LinkIcon size={14} />}
            tooltip="Add Link"
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().unsetAllMarks().run()} 
            isActive={false}
            icon={<X size={14} className="text-red-500" />}
            tooltip="Clear Format"
          />
        </div>

        <button 
          onClick={() => rawText && onChange(rawText)} 
          disabled={!rawText}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
          title="Reset to Original"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="prose-container flex-1 overflow-y-auto relative">
        <EditorContent editor={editor} className="h-full" />
      </div>
      
      {/* Character Count - Fixed at bottom */}
      <div className={`absolute bottom-3 right-4 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md border z-10 ${chars > 1024 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100/80 text-slate-400 border-slate-200'}`}>
        {chars} / 1024
      </div>

    </div>
  );
}

const ToolbarButton = ({ onClick, isActive, icon, tooltip }: any) => (
  <button
    onClick={onClick}
    title={tooltip}
    className={`p-2 rounded-lg transition-all ${
      isActive 
        ? 'bg-violet-600 text-white shadow-sm' 
        : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'
    }`}
  >
    {icon}
  </button>
);
