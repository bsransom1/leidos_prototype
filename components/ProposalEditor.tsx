'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Markdown } from 'tiptap-markdown';
import type { Editor } from '@tiptap/core';
import type { Proposal, BAA, ProposalSection, User } from '@/types';
import {
  FloppyDisk,
  CircleNotch,
  Medal,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowCounterClockwise,
  ArrowClockwise,
  Users,
  UserPlus,
  X,
  Shield,
  PencilSimple,
  Eye,
} from '@phosphor-icons/react';
import ConfidenceScore from './ConfidenceScore';
import { fieldClass } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProposalEditorProps {
  proposal: Proposal;
  baa: BAA;
  onSave: (updated: Proposal) => Promise<void>;
  onAward?: () => void;
  readOnly?: boolean;
  collaborators?: User[];
  onAddCollaborator?: (email: string, role: User['role']) => Promise<void>;
  proposalId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusIcon(status: string) {
  if (status === 'strong') return <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" weight="bold" />;
  if (status === 'needs-improvement') return <WarningCircle className="h-3 w-3 text-amber-400 shrink-0" weight="bold" />;
  return <XCircle className="h-3 w-3 text-red-400 shrink-0" weight="bold" />;
}

function roleIcon(role: User['role']) {
  if (role === 'admin') return <Shield className="h-3 w-3 text-blue-600" weight="bold" />;
  if (role === 'editor') return <PencilSimple className="h-3 w-3 text-indigo-600" weight="bold" />;
  return <Eye className="h-3 w-3 text-gray-400" weight="bold" />;
}

function roleBadgeClass(role: User['role']) {
  if (role === 'admin') return 'border-blue-300 bg-blue-50 text-blue-700';
  if (role === 'editor') return 'border-indigo-300 bg-indigo-50 text-indigo-700';
  return 'border-gray-200 bg-gray-100 text-gray-500';
}

// ── Collaborator floating panel ────────────────────────────────────────────────

function CollabOverlay({
  collaborators,
  onAddCollaborator,
  onClose,
  anchorRect,
}: {
  collaborators: User[];
  onAddCollaborator?: (email: string, role: User['role']) => Promise<void>;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const top = anchorRect ? anchorRect.bottom + 8 : 80;
  const right = anchorRect ? window.innerWidth - anchorRect.right : 24;

  const handleInvite = async () => {
    if (!email || !onAddCollaborator) return;
    setSending(true);
    await onAddCollaborator(email, 'viewer');
    setEmail('');
    setSending(false);
    setShowInvite(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed z-50 w-72 overflow-hidden border border-ds-border bg-ds-surface shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-sm"
        style={{ top, right }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ds-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-ds-text-muted" weight="bold" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
              Collaborators
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onAddCollaborator && !showInvite && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-ds-info hover:text-ds-text transition-colors"
              >
                <UserPlus className="h-3 w-3" weight="bold" />
                Invite
              </button>
            )}
            <button type="button" onClick={onClose} className="text-ds-text-muted hover:text-ds-text transition-colors">
              <X className="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="border-b border-ds-border bg-ds-page/40 px-4 py-3 space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="user@agency.gov"
              autoFocus
              className={fieldClass + ' text-xs w-full'}
            />
            <p className="font-mono text-[10px] text-ds-text-muted">Viewer access only · link expires in 7 days</p>
            <div className="flex gap-2">
              <Button type="button" variant="primary" className="!px-3 !py-1 !text-[10px]" onClick={handleInvite} disabled={sending || !email}>
                {sending ? 'Sending…' : 'Send invite'}
              </Button>
              <Button type="button" variant="secondary" className="!px-3 !py-1 !text-[10px]" onClick={() => { setShowInvite(false); setEmail(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* User list */}
        <div className="max-h-64 overflow-y-auto py-1">
          {collaborators.length === 0 ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-ds-text-muted">
              No collaborators yet
            </p>
          ) : (
            collaborators.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 px-4 py-2 hover:bg-ds-shell/40 transition-colors">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-ds-border bg-ds-primary text-[11px] font-bold uppercase text-white">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-semibold text-ds-text">{u.name}</p>
                  <p className="truncate font-mono text-[10px] text-ds-text-muted">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {roleIcon(u.role)}
                  <span className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${roleBadgeClass(u.role)}`}>
                    {u.role}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Outline floating panel (replaces left sidebar) ────────────────────────────

function OutlineOverlay({
  sections,
  titles,
  dirty,
  onNavigate,
  onClose,
  anchorRect,
}: {
  sections: ProposalSection[];
  titles: Record<string, string>;
  dirty: Set<string>;
  onNavigate: (sectionId: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const top = anchorRect ? anchorRect.bottom + 8 : 80;
  const right = anchorRect ? window.innerWidth - anchorRect.right : 24;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 w-72 overflow-hidden border border-ds-border bg-ds-surface shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-sm"
        style={{ top, right }}
      >
        <div className="flex items-center justify-between border-b border-ds-border px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" weight="bold" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
              Outline · {sections.length}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-ds-text-muted hover:text-ds-text transition-colors">
            <X className="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>

        <ul className="max-h-72 overflow-y-auto py-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onNavigate(s.id);
                  onClose();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-ds-shell/60 transition-colors group"
              >
                <span className="font-mono text-[9px] text-ds-text-subtle w-4 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {statusIcon(s.status)}
                <span className="flex-1 truncate font-mono text-[10px] text-ds-text-secondary group-hover:text-ds-text leading-tight">
                  {titles[s.id] || s.title}
                </span>
                {dirty.has(s.id) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-ds-accent shrink-0" title="Unsaved changes" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

// ── Format toolbar ────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
      }}
      className={`flex h-6 min-w-[1.5rem] items-center justify-center px-1 font-mono text-[11px] font-semibold transition-colors disabled:opacity-40 ${
        active
          ? 'bg-blue-100 text-blue-700 border border-blue-300'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px bg-gray-200" />;
}

function FormatToolbar({
  activeEditor,
  saving,
  dirtyCount,
  onSave,
  onAward,
}: {
  activeEditor: Editor | null;
  saving: boolean;
  dirtyCount: number;
  onSave: () => void;
  onAward?: () => void;
}) {
  const e = activeEditor;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-6 py-1.5 backdrop-blur-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5">
        {/* History */}
        <ToolbarButton
          title="Undo (⌘Z)"
          disabled={!e?.can().undo()}
          onClick={() => e?.chain().focus().undo().run()}
        >
          <ArrowCounterClockwise className="h-3.5 w-3.5" weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          title="Redo (⌘⇧Z)"
          disabled={!e?.can().redo()}
          onClick={() => e?.chain().focus().redo().run()}
        >
          <ArrowClockwise className="h-3.5 w-3.5" weight="bold" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline marks */}
        <ToolbarButton title="Bold (⌘B)" active={!!e?.isActive('bold')} onClick={() => e?.chain().focus().toggleBold().run()}>
          B
        </ToolbarButton>
        <ToolbarButton title="Italic (⌘I)" active={!!e?.isActive('italic')} onClick={() => e?.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Underline (⌘U)" active={!!e?.isActive('underline')} onClick={() => e?.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={!!e?.isActive('strike')} onClick={() => e?.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton title="Heading 1" active={!!e?.isActive('heading', { level: 1 })} onClick={() => e?.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </ToolbarButton>
        <ToolbarButton title="Heading 2" active={!!e?.isActive('heading', { level: 2 })} onClick={() => e?.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton title="Heading 3" active={!!e?.isActive('heading', { level: 3 })} onClick={() => e?.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton title="Bullet list" active={!!e?.isActive('bulletList')} onClick={() => e?.chain().focus().toggleBulletList().run()}>
          • List
        </ToolbarButton>
        <ToolbarButton title="Ordered list" active={!!e?.isActive('orderedList')} onClick={() => e?.chain().focus().toggleOrderedList().run()}>
          1. List
        </ToolbarButton>

        <ToolbarDivider />

        {/* Blockquote */}
        <ToolbarButton title="Blockquote" active={!!e?.isActive('blockquote')} onClick={() => e?.chain().focus().toggleBlockquote().run()}>
          " Quote
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text align */}
        <ToolbarButton title="Align left" active={!!e?.isActive({ textAlign: 'left' })} onClick={() => e?.chain().focus().setTextAlign('left').run()}>
          ←
        </ToolbarButton>
        <ToolbarButton title="Align center" active={!!e?.isActive({ textAlign: 'center' })} onClick={() => e?.chain().focus().setTextAlign('center').run()}>
          ↔
        </ToolbarButton>
        <ToolbarButton title="Align right" active={!!e?.isActive({ textAlign: 'right' })} onClick={() => e?.chain().focus().setTextAlign('right').run()}>
          →
        </ToolbarButton>
      </div>

      {/* Right: save + award */}
      <div className="flex items-center gap-2 shrink-0">
        {dirtyCount > 0 && (
          <span className="font-mono text-[10px] text-gray-400">
            {dirtyCount} unsaved
          </span>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSave}
          disabled={saving || dirtyCount === 0}
          className="inline-flex items-center gap-1.5 border border-blue-600 bg-blue-600 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <CircleNotch className="h-3 w-3 animate-spin" weight="bold" />
          ) : (
            <FloppyDisk className="h-3 w-3" weight="bold" />
          )}
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onAward && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onAward}
            className="inline-flex items-center gap-1.5 border border-emerald-600 bg-emerald-600 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-emerald-700 transition-colors"
          >
            <Medal className="h-3 w-3" weight="bold" />
            Mark awarded
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section editor ─────────────────────────────────────────────────────────────

function SectionEditor({
  section,
  sectionIndex,
  titleOverride,
  onTitleChange,
  onContentChange,
  onFocus,
  readOnly,
}: {
  section: ProposalSection;
  sectionIndex: number;
  titleOverride: string;
  onTitleChange: (id: string, title: string) => void;
  onContentChange: (id: string, markdown: string) => void;
  onFocus: (editor: Editor) => void;
  readOnly?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Markdown.configure({ html: false, tightLists: true }),
    ],
    content: section.content || '',
    editable: !readOnly,
    onFocus: ({ editor: ed }) => onFocus(ed),
    onUpdate: ({ editor: ed }) => {
      const md: string = (ed.storage as any).markdown.getMarkdown();
      onContentChange(section.id, md);
    },
    editorProps: {
      attributes: {
        class: 'prose-editor min-h-[8rem] focus:outline-none',
        spellcheck: 'true',
      },
    },
  });

  return (
    <article
      id={`section-${section.id}`}
      className="scroll-mt-24 border border-gray-200 bg-white shadow-sm"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-2.5">
        <span className="font-mono text-[10px] text-gray-400 w-5 shrink-0 text-right">
          {String(sectionIndex + 1).padStart(2, '0')}
        </span>
        {readOnly ? (
          <h3 className="flex-1 text-[13px] font-semibold text-gray-900">{titleOverride}</h3>
        ) : (
          <input
            type="text"
            value={titleOverride}
            onChange={(e) => onTitleChange(section.id, e.target.value)}
            className="flex-1 bg-transparent text-[13px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
            placeholder="Section title"
          />
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {statusIcon(section.status)}
          {section.confidence != null && (
            <span className="font-mono text-[10px] text-gray-400">{section.confidence}%</span>
          )}
          {section.required && (
            <span className="border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-700">
              Required
            </span>
          )}
        </div>
      </div>

      {/* Editor content */}
      <div className="px-8 py-5 prose-wrap">
        <EditorContent editor={editor} />
      </div>
    </article>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProposalEditor({ proposal, baa, onSave, onAward, readOnly, collaborators = [], onAddCollaborator, proposalId }: ProposalEditorProps) {
  void proposalId;
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [, forceUpdate] = useState(0);
  const [titles, setTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries((proposal.sections || []).map((s) => [s.id, s.title]))
  );
  const [contents, setContents] = useState<Record<string, string>>(() =>
    Object.fromEntries((proposal.sections || []).map((s) => [s.id, s.content || '']))
  );
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [collabAnchor, setCollabAnchor] = useState<DOMRect | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [outlineAnchor, setOutlineAnchor] = useState<DOMRect | null>(null);
  const outlineButtonRef = useRef<HTMLButtonElement>(null);

  // Re-render toolbar when active editor's selection/transaction changes
  useEffect(() => {
    if (!activeEditor) return;
    const handler = () => forceUpdate((n) => n + 1);
    activeEditor.on('selectionUpdate', handler);
    activeEditor.on('transaction', handler);
    return () => {
      activeEditor.off('selectionUpdate', handler);
      activeEditor.off('transaction', handler);
    };
  }, [activeEditor]);

  const handleTitleChange = useCallback((id: string, title: string) => {
    setTitles((prev) => ({ ...prev, [id]: title }));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const handleContentChange = useCallback((id: string, markdown: string) => {
    setContents((prev) => ({ ...prev, [id]: markdown }));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updatedSections = (proposal.sections || []).map((s) => ({
      ...s,
      title: titles[s.id] ?? s.title,
      content: contents[s.id] ?? s.content,
    }));
    const updatedProposal: Proposal = { ...proposal, sections: updatedSections };
    await onSave(updatedProposal);
    setDirty(new Set());
    setSaving(false);
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShareClick = () => {
    setShowOutline(false);
    if (shareButtonRef.current) {
      setCollabAnchor(shareButtonRef.current.getBoundingClientRect());
    }
    setShowCollab((v) => !v);
  };

  const handleOutlineClick = () => {
    setShowCollab(false);
    if (outlineButtonRef.current) {
      setOutlineAnchor(outlineButtonRef.current.getBoundingClientRect());
    }
    setShowOutline((v) => !v);
  };

  const sections = proposal.sections || [];

  return (
    <div className="flex flex-col min-h-0">
      {/* Document title area */}
      <div className="border-b border-ds-border px-8 py-5 bg-ds-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-ds-text leading-tight">{proposal.title}</h1>
            <p className="mt-1 font-mono text-[11px] text-ds-text-muted">
              Solicitation: {baa.title || '—'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Outline — same pattern as Share; opens floating section navigator */}
            {sections.length > 0 && (
              <button
                ref={outlineButtonRef}
                type="button"
                onClick={handleOutlineClick}
                className="flex shrink-0 items-center gap-2 border border-ds-border bg-ds-shell/60 px-3 py-1.5 transition-colors hover:bg-ds-shell hover:border-emerald-600/35"
                title="Jump to section"
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" weight="bold" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary">
                  Outline
                </span>
              </button>
            )}

            {/* Share / collaborators button */}
            <button
              ref={shareButtonRef}
              type="button"
              onClick={handleShareClick}
              className="flex shrink-0 items-center gap-2 border border-ds-border bg-ds-shell/60 px-3 py-1.5 transition-colors hover:bg-ds-shell hover:border-ds-accent/40"
            >
              {/* Collaborator avatar chips */}
              {collaborators.length > 0 && (
                <div className="flex -space-x-1.5">
                  {collaborators.slice(0, 3).map((u) => (
                    <div
                      key={u.id}
                      title={u.email}
                      className="flex h-5 w-5 items-center justify-center border border-ds-surface bg-ds-primary font-mono text-[9px] font-bold uppercase text-white"
                    >
                      {u.name.charAt(0)}
                    </div>
                  ))}
                  {collaborators.length > 3 && (
                    <div className="flex h-5 w-5 items-center justify-center border border-ds-surface bg-ds-shell font-mono text-[9px] text-ds-text-muted">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
              )}
              <Users className="h-3.5 w-3.5 text-ds-text-secondary" weight="bold" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary">
                {collaborators.length > 0 ? `${collaborators.length}` : 'Share'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-3">
          <ConfidenceScore score={proposal.overallConfidence} />
        </div>
      </div>

      {/* Collaborator floating overlay */}
      {showCollab && (
        <CollabOverlay
          collaborators={collaborators}
          onAddCollaborator={onAddCollaborator}
          onClose={() => setShowCollab(false)}
          anchorRect={collabAnchor}
        />
      )}

      {showOutline && sections.length > 0 && (
        <OutlineOverlay
          sections={sections}
          titles={titles}
          dirty={dirty}
          onNavigate={scrollToSection}
          onClose={() => setShowOutline(false)}
          anchorRect={outlineAnchor}
        />
      )}

      {/* Sticky format toolbar */}
      {!readOnly && (
        <FormatToolbar
          activeEditor={activeEditor}
          saving={saving}
          dirtyCount={dirty.size}
          onSave={handleSave}
          onAward={onAward}
        />
      )}

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex-1 min-w-0 space-y-4 p-6 bg-gray-100">
          {sections.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-ds-text-muted">No sections generated yet.</p>
            </div>
          ) : (
            sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                sectionIndex={index}
                titleOverride={titles[section.id] ?? section.title}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onFocus={setActiveEditor}
                readOnly={readOnly}
              />
            ))
          )}

          {/* Bottom save bar */}
          {!readOnly && dirty.size > 0 && (
            <div className="sticky bottom-4 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 border border-ds-primary bg-ds-primary px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-ds-md hover:brightness-110 transition-[filter] disabled:opacity-50"
              >
                {saving ? (
                  <CircleNotch className="h-3.5 w-3.5 animate-spin" weight="bold" />
                ) : (
                  <FloppyDisk className="h-3.5 w-3.5" weight="bold" />
                )}
                {saving ? 'Saving…' : `Save ${dirty.size} change${dirty.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
