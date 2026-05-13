'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Markdown } from 'tiptap-markdown';
import type { Editor } from '@tiptap/core';
import type { Proposal, BAA, ProposalSection, User } from '@/types';
import {
  CheckCircle,
  WarningCircle,
  XCircle,
  UserPlus,
  X,
  Shield,
  PencilSimple,
  Eye,
  Trash,
} from '@phosphor-icons/react';
import { fieldClass } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isAdmin, type PmRole } from '@/lib/pm-access';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProposalEditorHandle = {
  save: () => Promise<void>;
  openCollaborators: (anchorRect: DOMRect) => void;
  dirtyCount: number;
  saving: boolean;
};

interface ProposalEditorProps {
  proposal: Proposal;
  baa: BAA;
  onSave: (updated: Proposal) => Promise<void>;
  onAward?: () => void;
  readOnly?: boolean;
  collaborators?: User[];
  onAddCollaborator?: (email: string, role: User['role']) => Promise<void>;
  /** Supabase auth user id — row with this id is the owner chip, not a DB collaborator row. */
  ownerUserId?: string;
  onCollaboratorRoleChange?: (collaboratorId: string, role: User['role']) => Promise<void>;
  onCollaboratorRemove?: (collaboratorId: string) => Promise<void>;
  proposalId?: string;
  /** When set, gates collaborator management and award (undefined = unrestricted for legacy callers). */
  effectiveRole?: PmRole | null;
  onExportDocx?: () => void | Promise<void>;
  exportBusy?: boolean;
  /** Surface the currently focused editor to the parent (for header toolbars). */
  onActiveEditorChange?: (editor: Editor | null) => void;
  /** When true, do not show the floating in-document selection toolbar. */
  disableFloatingSelectionToolbar?: boolean;
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
  onCollaboratorRoleChange,
  onCollaboratorRemove,
  ownerUserId,
  onClose,
  anchorRect,
}: {
  collaborators: User[];
  onAddCollaborator?: (email: string, role: User['role']) => Promise<void>;
  onCollaboratorRoleChange?: (collaboratorId: string, role: User['role']) => Promise<void>;
  onCollaboratorRemove?: (collaboratorId: string) => Promise<void>;
  ownerUserId?: string;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<User['role']>('viewer');
  const [sending, setSending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const top = anchorRect ? anchorRect.bottom + 8 : 80;
  const right = anchorRect ? window.innerWidth - anchorRect.right : 24;

  const handleInvite = async () => {
    if (!email || !onAddCollaborator) return;
    setSending(true);
    await onAddCollaborator(email, inviteRole);
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
        className="fixed z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden border border-ds-border bg-ds-surface shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-sm"
        style={{ top, right }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ds-border px-4 py-3">
          <div className="flex items-center gap-2">
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
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as User['role'])}
              className={fieldClass + ' text-xs w-full'}
              title="Invite role"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <p className="font-mono text-[10px] leading-relaxed text-ds-text-muted">
              Viewer — read-only · Editor — edit & AI · Admin — full control & invites
            </p>
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
            collaborators.map((u) => {
              const isOwnerRow = ownerUserId != null && u.id === ownerUserId;
              const canChangeRole = !!onCollaboratorRoleChange && !!ownerUserId && !isOwnerRow;
              const canRemove = !!onCollaboratorRemove && !!ownerUserId && !isOwnerRow;

              return (
                <div key={u.id} className="border-b border-ds-border/60 px-4 py-2.5 last:border-b-0 hover:bg-ds-shell/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-ds-border bg-ds-primary text-[11px] font-bold uppercase text-white">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] font-semibold text-ds-text">{u.name}</p>
                      <p className="truncate font-mono text-[10px] text-ds-text-muted">{u.email}</p>
                    </div>
                    {!canChangeRole && (
                      <div className="flex shrink-0 items-center gap-1">
                        {roleIcon(u.role)}
                        <span
                          className={`border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${roleBadgeClass(u.role)}`}
                        >
                          {u.role}
                        </span>
                      </div>
                    )}
                  </div>
                  {(canChangeRole || canRemove) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-9">
                      {canChangeRole && (
                        <>
                          <label className="font-mono text-[9px] uppercase tracking-wide text-ds-text-muted">Role</label>
                          <select
                            value={u.role}
                            disabled={updatingId === u.id}
                            onChange={async (e) => {
                              const next = e.target.value as User['role'];
                              if (next === u.role || !onCollaboratorRoleChange) return;
                              setUpdatingId(u.id);
                              try {
                                await onCollaboratorRoleChange(u.id, next);
                              } finally {
                                setUpdatingId(null);
                              }
                            }}
                            className={fieldClass + ' flex-1 min-w-[7rem] py-1 text-[11px]'}
                            title="Change access level"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </>
                      )}
                      {canRemove && (
                        <button
                          type="button"
                          title="Remove from proposal"
                          disabled={updatingId === u.id}
                          onClick={async () => {
                            if (!onCollaboratorRemove) return;
                            if (!confirm(`Remove ${u.email} from this proposal? They will lose access.`)) return;
                            setUpdatingId(u.id);
                            try {
                              await onCollaboratorRemove(u.id);
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                          className="inline-flex shrink-0 items-center justify-center rounded-ds-sm border border-red-900/40 bg-red-950/30 p-1.5 text-red-300 hover:bg-red-950/50 disabled:opacity-40"
                        >
                          <Trash className="h-3.5 w-3.5" weight="bold" aria-hidden />
                        </button>
                      )}
                      {updatingId === u.id && (
                        <span className="font-mono text-[9px] text-ds-text-muted">Saving…</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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
        // Document-like typography (no UI card feel)
        class:
          'prose-editor min-h-[8rem] focus:outline-none font-serif text-[13px] leading-[1.7] text-slate-950',
        spellcheck: 'true',
      },
    },
  });

  return (
    <article
      id={`section-${section.id}`}
      className="scroll-mt-24"
    >
      <div className="relative">
        {/* Margin section label (outside text margin) */}
        <span
          aria-hidden
          className="absolute -left-14 top-1 font-mono text-[10px] text-slate-500 tabular-nums"
        >
          {String(sectionIndex + 1).padStart(2, '0')}
        </span>

        {/* In-document heading */}
        {readOnly ? (
          <h2 className="text-[15px] font-bold tracking-tight text-slate-950 mt-10 first:mt-0">
            {titleOverride}
          </h2>
        ) : (
          <input
            type="text"
            value={titleOverride}
            onChange={(e) => onTitleChange(section.id, e.target.value)}
            className="mt-10 first:mt-0 w-full bg-transparent text-[15px] font-bold tracking-tight text-slate-950 placeholder:text-slate-400 focus:outline-none"
            placeholder="Section title"
          />
        )}

        {/* Editor content */}
        <div className="mt-4 prose-wrap">
          <EditorContent editor={editor} />
        </div>
      </div>
    </article>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const ProposalEditor = forwardRef<ProposalEditorHandle, ProposalEditorProps>(function ProposalEditor(
  {
    proposal,
    baa,
    onSave,
    onAward,
    readOnly,
    collaborators = [],
    onAddCollaborator,
    ownerUserId,
    onCollaboratorRoleChange,
    onCollaboratorRemove,
    proposalId,
    effectiveRole,
    onExportDocx,
    exportBusy = false,
    onActiveEditorChange,
    disableFloatingSelectionToolbar,
  },
  ref
) {
  void proposalId;
  void baa;
  void onAward;
  void onExportDocx;
  void exportBusy;
  const unrestricted = effectiveRole === undefined || effectiveRole === null;
  const isProposalAdmin = unrestricted || isAdmin(effectiveRole);
  const canManageCollaborators =
    isProposalAdmin && (!!onAddCollaborator || !!onCollaboratorRemove || !!onCollaboratorRoleChange);
  const canOpenCollaborators = collaborators.length > 0;
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [, forceUpdate] = useState(0);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
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
  const dirtyCount = dirty.size;

  const handleSave = useCallback(async () => {
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
  }, [onSave, proposal, titles, contents]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      await handleSave();
    },
    openCollaborators: (anchorRect: DOMRect) => {
      setCollabAnchor(anchorRect);
      setShowCollab(true);
    },
    dirtyCount,
    saving,
  }), [dirtyCount, saving, handleSave]);

  // Re-render toolbar when active editor's selection/transaction changes
  useEffect(() => {
    if (!activeEditor) return;
    const handler = () => {
      forceUpdate((n) => n + 1);
      if (readOnly) return;
      try {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          setSelectionRect(null);
          return;
        }
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          setSelectionRect(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
          setSelectionRect(null);
          return;
        }
        setSelectionRect(rect);
      } catch {
        setSelectionRect(null);
      }
    };
    activeEditor.on('selectionUpdate', handler);
    activeEditor.on('transaction', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      activeEditor.off('selectionUpdate', handler);
      activeEditor.off('transaction', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [activeEditor, readOnly]);

  const handleTitleChange = useCallback((id: string, title: string) => {
    setTitles((prev) => ({ ...prev, [id]: title }));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const handleContentChange = useCallback((id: string, markdown: string) => {
    setContents((prev) => ({ ...prev, [id]: markdown }));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const sections = proposal.sections || [];

  const selectionToolbar = useMemo(() => {
    const e = activeEditor;
    if (!e) return null;
    return (
      <div className="flex items-center gap-0.5 rounded-ds-sm border border-ds-border bg-ds-surface px-1.5 py-1 shadow-ds-sm">
        <ToolbarButton title="Bold (⌘B)" active={!!e.isActive('bold')} onClick={() => e.chain().focus().toggleBold().run()}>
          B
        </ToolbarButton>
        <ToolbarButton title="Italic (⌘I)" active={!!e.isActive('italic')} onClick={() => e.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Underline (⌘U)" active={!!e.isActive('underline')} onClick={() => e.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={!!e.isActive('strike')} onClick={() => e.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title="Heading 2" active={!!e.isActive('heading', { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton title="Heading 3" active={!!e.isActive('heading', { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title="Bullet list" active={!!e.isActive('bulletList')} onClick={() => e.chain().focus().toggleBulletList().run()}>
          •
        </ToolbarButton>
        <ToolbarButton title="Ordered list" active={!!e.isActive('orderedList')} onClick={() => e.chain().focus().toggleOrderedList().run()}>
          1.
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title="Blockquote" active={!!e.isActive('blockquote')} onClick={() => e.chain().focus().toggleBlockquote().run()}>
          “”
        </ToolbarButton>
      </div>
    );
  }, [activeEditor]);

  return (
    <div className="flex flex-col min-h-0">
      {/* Collaborator floating overlay */}
      {showCollab && canOpenCollaborators && (
        <CollabOverlay
          collaborators={collaborators}
          onAddCollaborator={canManageCollaborators ? onAddCollaborator : undefined}
          onCollaboratorRoleChange={canManageCollaborators ? onCollaboratorRoleChange : undefined}
          onCollaboratorRemove={canManageCollaborators ? onCollaboratorRemove : undefined}
          ownerUserId={ownerUserId}
          onClose={() => setShowCollab(false)}
          anchorRect={collabAnchor}
        />
      )}

      <div className="flex flex-1 min-h-0 flex-col">
        {/* Floating selection toolbar (custom positioning) */}
        {!disableFloatingSelectionToolbar && !readOnly && activeEditor && selectionRect && selectionToolbar && (
          <div
            className="fixed z-50"
            style={{
              left: Math.max(12, selectionRect.left + selectionRect.width / 2),
              top: Math.max(12, selectionRect.top - 12),
              transform: 'translate(-50%, -100%)',
            }}
          >
            {selectionToolbar}
          </div>
        )}

        {/* Document body (canvas wrapper is owned by parent) */}
        <div className="flex-1 min-w-0">
          {sections.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-ds-text-muted">No sections generated yet.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  sectionIndex={index}
                  titleOverride={titles[section.id] ?? section.title}
                  onTitleChange={handleTitleChange}
                  onContentChange={handleContentChange}
                  onFocus={(ed) => {
                    setActiveEditor(ed);
                    onActiveEditorChange?.(ed);
                  }}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProposalEditor;
