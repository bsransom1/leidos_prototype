'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ArrowRight, Trash, PencilSimple, FloppyDisk, X, SquaresFour } from '@phosphor-icons/react';
import ProposalEditor from '@/components/ProposalEditor';
import type { BAA, Proposal } from '@/types';
import type { User } from '@supabase/supabase-js';
import { AppFooter, AppHeader } from '@/components/ui/app-shell';
import { BackLink } from '@/components/ui/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
}

export default function ProposalDetailClient({ proposal, user }: ProposalDetailClientProps) {
  void user;
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [proposalData, setProposalData] = useState<Proposal>(() => JSON.parse(proposal.generated_output));
  const baaData: BAA = JSON.parse(proposal.baa_input);

  const handleSaveProposalContent = async (updated: Proposal) => {
    const supabase = createClient();
    await supabase
      .from('proposals')
      .update({ generated_output: JSON.stringify(updated) })
      .eq('id', proposal.id);
    setProposalData(updated);
  };

  const handleSaveTitle = async () => {
    const supabase = createClient();
    const { error } = await supabase.from('proposals').update({ title }).eq('id', proposal.id);

    if (!error) {
      setIsEditingTitle(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('proposals').delete().eq('id', proposal.id);

    if (!error) {
      router.push('/dashboard');
    } else {
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
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="text-ds-text-muted hover:text-ds-text-secondary shrink-0 rounded-ds-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                  >
                    <PencilSimple className="h-3.5 w-3.5" weight="bold" aria-hidden />
                  </button>
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
            <Button type="button" variant="ghost" className="!p-2" disabled={isDeleting} onClick={handleDelete}>
              <Trash className="h-4 w-4 text-red-300" weight="bold" aria-hidden />
            </Button>
          </div>
        </div>
      </AppHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="overflow-hidden border-t border-ds-border bg-ds-surface shadow-ds-md">
          <ProposalEditor
            proposal={proposalData}
            baa={baaData}
            onSave={handleSaveProposalContent}
            readOnly={proposal.status === 'awarded'}
            onAward={proposal.status !== 'awarded' ? async () => {
              const res = await fetch(`/api/proposals/${proposal.id}/award`, { method: 'POST' });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                alert(data.error ?? 'Could not mark as awarded');
                return;
              }
              router.push(data.redirectTo ?? `/dashboard/projects/${proposal.id}/pm`);
              router.refresh();
            } : undefined}
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
