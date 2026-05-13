'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Trash, PencilSimple, FloppyDisk, X, SquaresFour } from '@phosphor-icons/react';
import ProposalEditor from '@/components/ProposalEditor';
import type { BAA, Proposal, User as AppUser } from '@/types';
import type { User } from '@supabase/supabase-js';
import { AppFooter, AppHeader } from '@/components/ui/app-shell';
import { BackLink } from '@/components/ui/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildProposalSubmissionDocx, downloadProposalDocx } from '@/lib/proposal-export-docx';
import { canEdit, isAdmin, type PmRole } from '@/lib/pm-access';

interface ProposalDetailClientProps {
  proposal: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    generated_output: string;
    baa_input: string;
  };
  user: User;
  effectiveRole: PmRole;
}

export default function ProposalDetailClient({ proposal, user, effectiveRole }: ProposalDetailClientProps) {
  const router = useRouter();
  const editPermitted = canEdit(effectiveRole);
  const adminPermitted = isAdmin(effectiveRole);
  const documentReadOnly = proposal.status === 'awarded' || !editPermitted;

  const chip: AppUser['role'] =
    effectiveRole === 'admin' ? 'admin' : effectiveRole === 'editor' ? 'editor' : 'viewer';

  const [collaborators, setCollaborators] = useState<AppUser[]>([
    {
      id: user.id,
      name: user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: chip,
      organizationId: 'org-1',
    },
  ]);

  const mergeCollaboratorsFromApi = useCallback(async () => {
    if (!adminPermitted) return;
    try {
      const response = await fetch(`/api/get-collaborators?proposalId=${proposal.id}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (result.success && result.data) {
        const owner: AppUser = {
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: chip,
          organizationId: 'org-1',
        };
        const invited: AppUser[] = result.data.map((c: { id: string; email: string; role: string }) => ({
          id: c.id,
          name: c.email.split('@')[0],
          email: c.email,
          role: c.role as AppUser['role'],
          organizationId: 'org-1',
        }));
        setCollaborators([owner, ...invited]);
      }
    } catch (e) {
      console.error('Load collaborators:', e);
    }
  }, [adminPermitted, proposal.id, user.id, user.email, chip]);

  useEffect(() => {
    void mergeCollaboratorsFromApi();
  }, [mergeCollaboratorsFromApi]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [proposalData, setProposalData] = useState<Proposal>(() => JSON.parse(proposal.generated_output));
  const baaData: BAA = JSON.parse(proposal.baa_input);

  const handleExportDocx = async () => {
    if (!proposalData.sections?.length) {
      alert('No proposal sections to export yet.');
      return;
    }
    setExportBusy(true);
    try {
      const blob = await buildProposalSubmissionDocx(proposalData, baaData);
      downloadProposalDocx(blob, proposalData.title);
    } catch (e) {
      console.error(e);
      alert('Could not generate the Word document. Try again.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleSaveProposalContent = async (updated: Proposal) => {
    const res = await fetch('/api/save-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: proposal.id,
        title: updated.title,
        baaInput: proposal.baa_input,
        generatedOutput: JSON.stringify(updated),
        status: proposal.status,
        currentStep: 'proposal',
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? 'Could not save proposal');
      return;
    }
    setProposalData(updated);
  };

  const handleSaveTitle = async () => {
    const res = await fetch('/api/save-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: proposal.id,
        title,
        baaInput: proposal.baa_input,
        generatedOutput: proposal.generated_output,
        status: proposal.status,
        currentStep: 'proposal',
      }),
    });
    if (res.ok) {
      setIsEditingTitle(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    setIsDeleting(true);
    const res = await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/dashboard');
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? 'Could not delete proposal');
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-ds-page">
      <AppHeader>
        <div className="flex w-full flex-wrap items-start justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 flex-[1_1_280px] items-start gap-3">
            <BackLink
              href={proposal.status === 'awarded' ? `/dashboard/projects/${proposal.id}/pm` : '/dashboard'}
              className="mt-1.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" weight="bold" aria-label="Back to dashboard" />
            </BackLink>
            {isEditingTitle ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xl min-w-[12rem]" autoFocus />
                <Button type="button" variant="ghost" className="!p-1.5" onClick={handleSaveTitle}>
                  <FloppyDisk className="h-4 w-4 text-emerald-400" weight="bold" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="!p-1.5"
                  onClick={() => {
                    setTitle(proposal.title);
                    setIsEditingTitle(false);
                  }}
                >
                  <X className="h-4 w-4 text-ds-text-muted" weight="bold" aria-hidden />
                </Button>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="ds-h3 truncate text-ds-text">{proposal.title}</p>
                  {editPermitted && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="text-ds-text-muted hover:text-ds-text-secondary shrink-0 rounded-ds-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                    >
                      <PencilSimple className="h-3.5 w-3.5" weight="bold" aria-hidden />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-ds-text-muted">Proposal artifact</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {proposal.status === 'awarded' ? (
              <Badge tone="accent">Awarded</Badge>
            ) : (
              <Badge tone={proposal.status === 'generated' ? 'positive' : 'default'}>{proposal.status}</Badge>
            )}
            {proposal.status === 'awarded' && (
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
                onClick={() => router.push(`/dashboard/projects/${proposal.id}/pm`)}
              >
                <SquaresFour className="h-3.5 w-3.5" weight="bold" aria-hidden />
                PM Dashboard
                <ArrowRight className="h-3 w-3" weight="bold" aria-hidden />
              </Button>
            )}
            {adminPermitted && (
              <Button type="button" variant="ghost" className="!p-2" disabled={isDeleting} onClick={handleDelete}>
                <Trash className="h-4 w-4 text-red-300" weight="bold" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </AppHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="overflow-hidden border-t border-ds-border bg-ds-surface shadow-ds-md">
          <ProposalEditor
            proposal={proposalData}
            baa={baaData}
            onSave={handleSaveProposalContent}
            readOnly={documentReadOnly}
            effectiveRole={effectiveRole}
            onExportDocx={handleExportDocx}
            exportBusy={exportBusy}
            proposalId={proposal.id}
            collaborators={collaborators}
            ownerUserId={user.id}
            onAddCollaborator={
              adminPermitted
                ? async (email, role) => {
                    const response = await fetch('/api/invite-collaborator', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ proposalId: proposal.id, email, role }),
                    });
                    const result = await response.json();
                    if (response.ok) {
                      await mergeCollaboratorsFromApi();
                      if (result.unchanged) {
                        /* no-op */
                      } else if (result.roleUpdated) {
                        alert(
                          result.emailSent
                            ? `Access updated to ${role}. A new invitation email was sent.`
                            : `Access updated to ${role}.`,
                        );
                      } else if (result.invitationLink) {
                        alert(`Invitation sent!\n\nLink: ${result.invitationLink}`);
                      }
                    } else {
                      alert(result.error ?? 'Invite failed');
                    }
                  }
                : undefined
            }
            onCollaboratorRoleChange={
              adminPermitted
                ? async (collaboratorId, role) => {
                    const res = await fetch(
                      `/api/proposals/${proposal.id}/collaborators/${collaboratorId}`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role }),
                      },
                    );
                    const j = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      alert(j.error ?? 'Could not update collaborator role');
                      return;
                    }
                    await mergeCollaboratorsFromApi();
                  }
                : undefined
            }
            onCollaboratorRemove={
              adminPermitted
                ? async (collaboratorId) => {
                    setCollaborators((prev) => prev.filter((u) => u.id !== collaboratorId));
                    try {
                      const res = await fetch(
                        `/api/proposals/${proposal.id}/collaborators/${collaboratorId}`,
                        { method: 'DELETE' },
                      );
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        await mergeCollaboratorsFromApi();
                        alert(j.error ?? 'Could not remove collaborator');
                        return;
                      }
                      await mergeCollaboratorsFromApi();
                    } catch {
                      await mergeCollaboratorsFromApi();
                      alert('Could not remove collaborator');
                    }
                  }
                : undefined
            }
            onAward={
              adminPermitted && proposal.status !== 'awarded'
                ? async () => {
                    const res = await fetch(`/api/proposals/${proposal.id}/award`, { method: 'POST' });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      alert(data.error ?? 'Could not mark as awarded');
                      return;
                    }
                    router.push(data.redirectTo ?? `/dashboard/projects/${proposal.id}/pm`);
                    router.refresh();
                  }
                : undefined
            }
          />
        </div>
      </div>

      <AppFooter>
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-3 text-[11px] uppercase tracking-[0.06em] text-ds-text-subtle">
          <span>Created {new Date(proposal.created_at).toLocaleString()}</span>
          <span>Operational domain</span>
        </div>
      </AppFooter>
    </div>
  );
}
