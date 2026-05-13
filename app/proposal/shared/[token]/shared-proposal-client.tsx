'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Proposal, BAA, ProposalSection } from '@/types';
import { useRouter } from 'next/navigation';
import { SignIn, CheckCircle, WarningCircle, XCircle, LockKey, FileText } from '@phosphor-icons/react';

type CollaboratorShareRole = 'viewer' | 'editor' | 'admin';

interface SharedProposalViewProps {
  proposal: {
    title: string;
    generated_output?: string;
    baa_input?: string;
  };
  /** Workspace route uses this id; editors/admins are redirected here when signed in. */
  proposalId: string;
  collaboratorRole: CollaboratorShareRole;
  collaboratorEmail: string;
  invitationToken: string;
  isAuthenticated: boolean;
}

function roleShareLabel(role: CollaboratorShareRole): string {
  if (role === 'admin') return 'Admin · Full control';
  if (role === 'editor') return 'Editor · Edit & AI';
  return 'Viewer · Read only';
}

export default function SharedProposalView({
  proposal,
  proposalId,
  collaboratorRole,
  collaboratorEmail,
  invitationToken,
  isAuthenticated,
}: SharedProposalViewProps) {
  const router = useRouter();
  const [proposalData, setProposalData] = useState<Proposal | null>(null);
  const [baaData, setBaaData] = useState<BAA | null>(null);
  const [loading, setLoading] = useState(true);

  // Editors/admins use the full proposal workspace; this route is read-only markdown.
  useEffect(() => {
    if (!loading && isAuthenticated && proposalId && (collaboratorRole === 'editor' || collaboratorRole === 'admin')) {
      router.replace(`/proposal/${proposalId}`);
    }
  }, [loading, isAuthenticated, collaboratorRole, proposalId, router]);

  useEffect(() => {
    try {
      if (proposal.generated_output) setProposalData(JSON.parse(proposal.generated_output));
      if (proposal.baa_input) setBaaData(JSON.parse(proposal.baa_input));
    } catch (e) {
      console.error('Error parsing proposal data:', e);
    } finally {
      setLoading(false);
    }
  }, [proposal]);

  const handleSignIn = () => {
    router.push(`/login?redirect=${encodeURIComponent(`/proposal/shared/${invitationToken}`)}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ds-page">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ds-primary border-t-transparent" />
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ds-text-muted">
            Loading proposal...
          </p>
        </div>
      </div>
    );
  }

  if (!proposalData && !proposal.generated_output) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ds-page px-4">
        <div className="w-full max-w-md border border-ds-border bg-ds-surface shadow-ds-md">
          <div className="h-[3px] bg-gradient-to-r from-ds-primary to-ds-accent" />
          <div className="px-8 py-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center border border-ds-border bg-ds-shell">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-ds-primary border-t-transparent" />
            </div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted mb-3">
              Generation in progress
            </p>
            <h1 className="text-base font-bold text-ds-text mb-3">{proposal.title}</h1>
            <p className="text-sm leading-relaxed text-ds-text-muted">
              This proposal is currently being generated. Check back in a few minutes — the link will work once generation is complete.
            </p>
          </div>
          <div className="border-t border-ds-border bg-ds-shell/40 px-8 py-3 text-center">
            <p className="font-mono text-[10px] text-ds-text-muted">LEIDOS GENAI · PROPOSAL INTELLIGENCE</p>
          </div>
        </div>
      </div>
    );
  }

  if (!proposalData || !baaData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ds-page px-4">
        <div className="w-full max-w-md border border-ds-border bg-ds-surface shadow-ds-md">
          <div className="h-[3px] bg-gradient-to-r from-ds-primary to-ds-accent" />
          <div className="px-8 py-7">
            <h1 className="text-base font-bold text-ds-text mb-3">Proposal unavailable</h1>
            <p className="text-sm leading-relaxed text-ds-text-muted">
              This proposal could not be loaded. Contact the proposal owner.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Brief handoff while redirecting editors/admins to the workspace
  if (isAuthenticated && (collaboratorRole === 'editor' || collaboratorRole === 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ds-page">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ds-primary border-t-transparent" />
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ds-text-muted">
            Opening workspace…
          </p>
        </div>
      </div>
    );
  }

  const sections = proposalData.sections || [];
  const generatedDate = proposalData.createdAt
    ? new Date(proposalData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-ds-page">
      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-ds-border bg-ds-header/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-2.5">
          {/* Brand + title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <FileText className="h-4 w-4 text-ds-primary" weight="bold" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-text-muted">
                Leidos <span className="text-ds-text">GenAI</span>
              </span>
            </div>
            <span className="text-ds-border shrink-0">/</span>
            <p className="font-mono text-[11px] text-ds-text truncate">{proposal.title}</p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 border border-ds-border bg-ds-shell/60 px-2 py-1">
              <LockKey className="h-3 w-3 text-ds-text-muted" weight="bold" />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ds-text-muted">
                {roleShareLabel(collaboratorRole)} · {collaboratorEmail}
              </span>
            </div>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-1.5 border border-ds-primary bg-ds-primary/20 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text hover:bg-ds-primary/30 transition-colors"
              >
                <SignIn className="h-3 w-3" weight="bold" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Document body ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-6 py-10">

        {/* Document header */}
        <div className="mb-10 border border-ds-border bg-ds-surface">
          {/* Accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-ds-primary to-ds-accent" />
          <div className="px-8 py-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-text-muted mb-2">
              DARPA BAA Proposal
            </p>
            <h1 className="text-2xl font-bold text-ds-text leading-tight mb-4">
              {proposalData.title}
            </h1>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 text-[12px]">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ds-text-muted block mb-0.5">
                  Solicitation
                </span>
                <span className="text-ds-text-secondary">{baaData.title || '—'}</span>
              </div>
              {generatedDate && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ds-text-muted block mb-0.5">
                    Generated
                  </span>
                  <span className="text-ds-text-secondary">{generatedDate}</span>
                </div>
              )}
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ds-text-muted block mb-0.5">
                  Sections
                </span>
                <span className="text-ds-text-secondary">{sections.length}</span>
              </div>
              {proposalData.overallConfidence != null && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ds-text-muted block mb-0.5">
                    Confidence
                  </span>
                  <span className="font-mono text-ds-accent font-semibold">
                    {proposalData.overallConfidence}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Confidentiality notice */}
          <div className="border-t border-ds-border bg-ds-shell/40 px-8 py-3">
            <p className="font-mono text-[10px] text-ds-text-muted">
              <span className="text-amber-400 font-semibold">CONTROLLED — READ ONLY</span>
              {' '}· Shared with {collaboratorEmail} · Do not distribute
            </p>
          </div>
        </div>

        {/* Table of contents */}
        {sections.length > 1 && (
          <div className="mb-8 border border-ds-border bg-ds-surface p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted mb-3">
              Table of Contents
            </p>
            <ol className="space-y-1.5">
              {sections.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3">
                  <a
                    href={`#section-${s.id}`}
                    className="flex items-center gap-2.5 group w-full"
                  >
                    <span className="font-mono text-[11px] text-ds-text-muted w-5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[12px] text-ds-text-secondary group-hover:text-ds-text transition-colors flex-1">
                      {s.title}
                    </span>
                    <span className="ml-auto font-mono text-[10px] shrink-0">
                      {s.status === 'strong' && <span className="text-emerald-400">STRONG</span>}
                      {s.status === 'needs-improvement' && <span className="text-amber-400">REVIEW</span>}
                      {s.status === 'weak' && <span className="text-orange-400">WEAK</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Proposal sections — full document */}
        <div className="space-y-6">
          {sections.length === 0 ? (
            <div className="border border-dashed border-ds-border bg-ds-surface/50 py-16 text-center">
              <p className="text-sm text-ds-text-muted">No proposal sections available.</p>
            </div>
          ) : (
            sections.map((section, index) => (
              <ProposalDocSection key={section.id} section={section} index={index} />
            ))
          )}
        </div>

        {/* Document footer */}
        <div className="mt-12 border-t border-ds-border pt-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ds-text-muted">
            Leidos GenAI · Proposal Intelligence Platform
          </p>
          <p className="font-mono text-[10px] text-ds-text-subtle mt-1">
            This document was generated by AI and requires human review before submission.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Section component ──────────────────────────────────────────────────────────

function ProposalDocSection({ section, index }: { section: ProposalSection; index: number }) {
  const statusConfig = {
    strong: {
      icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" weight="bold" />,
      label: 'Strong',
      labelClass: 'text-emerald-400',
      barClass: 'bg-emerald-600/60',
    },
    'needs-improvement': {
      icon: <WarningCircle className="h-3.5 w-3.5 text-amber-400" weight="bold" />,
      label: 'Needs Review',
      labelClass: 'text-amber-400',
      barClass: 'bg-amber-600/60',
    },
    weak: {
      icon: <XCircle className="h-3.5 w-3.5 text-orange-400" weight="bold" />,
      label: 'Weak',
      labelClass: 'text-orange-400',
      barClass: 'bg-orange-600/60',
    },
  };
  const cfg = statusConfig[section.status as keyof typeof statusConfig] ?? statusConfig.weak;

  return (
    <article id={`section-${section.id}`} className="border border-ds-border bg-ds-surface scroll-mt-16">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 border-b border-ds-border bg-ds-surface-elevated/60 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[10px] font-semibold text-ds-text-muted shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h2 className="text-[13px] font-semibold text-ds-text leading-tight truncate">
            {section.title}
          </h2>
          {section.required && (
            <span className="shrink-0 border border-ds-accent/40 bg-ds-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-300">
              Required
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {cfg.icon}
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${cfg.labelClass}`}>
            {cfg.label}
          </span>
          {section.confidence != null && (
            <span className="font-mono text-[10px] text-ds-text-muted ml-1">
              {section.confidence}%
            </span>
          )}
        </div>
      </div>

      {/* Section content */}
      <div className="px-8 py-6">
        {section.content ? (
          <div className="prose-proposal">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-4 text-[13px] leading-relaxed text-ds-text-secondary last:mb-0">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-ds-text">{children}</strong>
                ),
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-6 text-base font-bold text-ds-text first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2 mt-5 text-sm font-semibold text-ds-text first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-wide text-ds-text-muted first:mt-0">
                    {children}
                  </h3>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 ml-6 list-disc space-y-1.5 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 ml-6 list-decimal space-y-1.5 last:mb-0">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-[13px] leading-relaxed text-ds-text-secondary pl-1">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-4 border-l-4 border-ds-primary/60 pl-4 italic text-ds-text-muted">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-6 border-t border-ds-border" />,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="rounded bg-ds-shell px-1 py-0.5 font-mono text-[11px] text-amber-300">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
              }}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-[13px] italic text-ds-text-muted">No content generated for this section.</p>
        )}
      </div>
    </article>
  );
}
