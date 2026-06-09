'use client';

import { useState, useEffect } from 'react';
import type { Proposal, BAA } from '@/types';
import { useRouter } from 'next/navigation';
import { SignIn, ListNumbers } from '@phosphor-icons/react';
import ProposalEditor from '@/components/ProposalEditor';
import { Button } from '@/components/ui/button';
import ConfidenceScore from '@/components/ConfidenceScore';

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

function roleLabel(role: CollaboratorShareRole): string {
  if (role === 'admin') return 'Admin · Full control';
  if (role === 'editor') return 'Editor · Edit & AI';
  return 'Viewer · Read only';
}

function SharedBrandMark() {
  return (
    <div className="shrink-0">
      <p className="text-[11px] font-semibold tracking-wide text-blue-700">P.A.S.S.</p>
      <p className="text-[10px] text-gray-500">Shared proposal</p>
    </div>
  );
}

function SharedStatusCard({
  title,
  description,
  loading,
}: {
  title: string;
  description: string;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e8eaed] px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <SharedBrandMark />
        <div className="mt-6 flex flex-col items-center gap-3">
          {loading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          )}
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-sm leading-relaxed text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
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
  const [outlineOpen, setOutlineOpen] = useState(false);

  // Editors/admins use the full proposal workspace; this route is read-only.
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

  const handleScrollToSection = (sectionId: string) => {
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.innerWidth < 1024) setOutlineOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e8eaed] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading document…</p>
        </div>
      </div>
    );
  }

  if (!proposalData && !proposal.generated_output) {
    return (
      <SharedStatusCard
        title={proposal.title}
        description="This proposal is still being generated. Check back in a few minutes — the link will work once generation is complete."
        loading
      />
    );
  }

  if (!proposalData || !baaData) {
    return (
      <SharedStatusCard
        title="Proposal unavailable"
        description="This proposal could not be loaded. Contact the proposal owner to get a new link."
      />
    );
  }

  if (isAuthenticated && (collaboratorRole === 'editor' || collaboratorRole === 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e8eaed]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-600">Opening workspace…</p>
        </div>
      </div>
    );
  }

  const sections = proposalData.sections || [];
  const noticeTag = baaData.noticeNumbers?.[0] ?? '';

  return (
    <div className="flex h-screen flex-col bg-[#e8eaed]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-2.5">
          <SharedBrandMark />

          <div className="min-w-0 flex-1 flex flex-col items-center justify-center px-4">
            <div className="flex items-center gap-2 min-w-0">
              {noticeTag && (
                <span className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500">
                  {noticeTag}
                </span>
              )}
              <p className="truncate text-[14px] font-semibold text-gray-900">{proposalData.title}</p>
            </div>
            <p className="mt-0.5 truncate max-w-[48rem] text-[11px] text-gray-500">
              {baaData.title || 'Shared proposal'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] text-gray-600 sm:inline">
              {roleLabel(collaboratorRole)} · {collaboratorEmail}
            </span>

            {!isAuthenticated && (
              <Button
                type="button"
                variant="secondary"
                className="!border-gray-200 !bg-white !px-3 !py-1.5 !text-[11px] !text-gray-700 hover:!bg-gray-50"
                onClick={handleSignIn}
              >
                <SignIn className="h-3.5 w-3.5" weight="bold" aria-hidden />
                Sign in
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              className="!border-gray-200 !bg-white !px-3 !py-1.5 !text-[11px] !text-gray-700 hover:!bg-gray-50"
              onClick={() => setOutlineOpen((v) => !v)}
              title="Toggle outline"
            >
              <ListNumbers className="h-3.5 w-3.5" weight="bold" aria-hidden />
              Outline
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden bg-[#e8eaed]">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-[780px]">
            <ProposalEditor
              proposal={proposalData}
              baa={baaData}
              onSave={async () => {}}
              readOnly
              effectiveRole="viewer"
              disableFloatingSelectionToolbar
            />
          </div>
        </div>

        {outlineOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 bg-black/20 lg:hidden"
              onClick={() => setOutlineOpen(false)}
              aria-label="Close outline"
            />
            <aside className="fixed right-0 top-[53px] z-30 h-[calc(100vh-53px)] w-[280px] overflow-y-auto border-l border-gray-200 bg-white lg:static lg:top-0 lg:z-auto lg:h-auto">
              <div className="border-b border-gray-200 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Outline</p>
                {proposalData.overallConfidence != null && (
                  <div className="mt-3">
                    <ConfidenceScore score={proposalData.overallConfidence} />
                  </div>
                )}
              </div>
              <ul className="py-2">
                {sections.map((s, idx) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection(s.id)}
                      className="w-full px-4 py-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-[2px] w-6 shrink-0 tabular-nums text-[10px] text-gray-400">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-gray-900">{s.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {s.confidence != null && (
                              <span className="text-[10px] text-gray-500">{s.confidence}% confidence</span>
                            )}
                            {s.required && (
                              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
