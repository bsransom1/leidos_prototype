'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FileText,
  Plus,
  SignOut,
  CalendarBlank,
  Trash,
  Users,
  Medal,
  ArrowRight,
  CircleNotch,
  X,
} from '@phosphor-icons/react';
import type { User } from '@supabase/supabase-js';
import { AppFooter, AppHeader, PassBrand } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import type { EnrichedProposal } from './page';

interface DashboardClientProps {
  user: User;
  proposals: EnrichedProposal[];
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWithinNextDays(dateLike: string | undefined, days: number) {
  if (!dateLike) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const ms = target.getTime() - today.getTime();
  const max = days * 24 * 60 * 60 * 1000;
  return ms >= 0 && ms <= max;
}

function statusLabel(status: string) {
  if (status === 'awarded') return 'AWARDED';
  if (status === 'generated') return 'IN REVIEW';
  return 'DRAFT';
}

function StatusPill({ status }: { status: string }) {
  const s = statusLabel(status);
  if (s === 'AWARDED') {
    return (
      <span className="inline-flex items-center gap-2 bg-[#C0DD97] text-[#27500A] px-2 py-1 rounded-[4px] text-[11px] tracking-[0.03em]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#27500A]" aria-hidden />
        <span className="font-mono font-semibold">{s}</span>
      </span>
    );
  }
  if (s === 'IN REVIEW') {
    return (
      <span className="inline-flex items-center gap-2 bg-[#FAC775] text-[#633806] px-2 py-1 rounded-[4px] text-[11px] tracking-[0.03em]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#633806]" aria-hidden />
        <span className="font-mono font-semibold">{s}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 bg-[#D3D1C7] text-[#444441] px-2 py-1 rounded-[4px] text-[11px] tracking-[0.03em]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#444441]" aria-hidden />
      <span className="font-mono font-semibold">{s}</span>
    </span>
  );
}

function ConfidenceCell({ confidence }: { confidence?: number }) {
  if (confidence == null) return <span className="font-mono text-[11px] text-ds-text-muted">—</span>;
  const pct = Math.max(0, Math.min(100, Math.round(confidence)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] w-[60px] bg-ds-border/60">
        <div className="h-full bg-ds-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-ds-text-secondary">{pct}%</span>
    </div>
  );
}

function OpsStatusBar({
  deadlines14,
  avgConfidence,
  activeCollabs,
}: {
  deadlines14: number;
  avgConfidence: number;
  activeCollabs: number;
}) {
  return (
    <div className="shrink-0 border-b border-ds-border bg-ds-shell/70">
      <div className="mx-auto flex h-9 max-w-7xl items-center px-6">
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
              Operational
            </span>
          </div>

          <div className="h-4 w-px bg-ds-border/60" aria-hidden />

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
              Deadlines
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                deadlines14 > 0 ? 'text-ds-danger' : 'text-ds-text-secondary'
              }`}
            >
              {deadlines14} within 14 days
            </span>
          </div>

          <div className="h-4 w-px bg-ds-border/60" aria-hidden />

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
              Avg confidence
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ds-text-secondary">
              {avgConfidence}%
            </span>
          </div>

          <div className="h-4 w-px bg-ds-border/60" aria-hidden />

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
              Active collabs
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ds-text-secondary">
              {activeCollabs}
            </span>
          </div>

          <div className="h-4 w-px bg-ds-border/60" aria-hidden />

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
              Updated
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ds-text-secondary"
              suppressHydrationWarning
            >
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Naming modal ───────────────────────────────────────────────────────────────

interface NamingModalProps {
  onClose: () => void;
  onStart: (name: string) => Promise<void>;
}

function NamingModal({ onClose, onStart }: NamingModalProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    await onStart(trimmed);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md border border-ds-border bg-ds-surface shadow-ds-md">
        {/* Accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-ds-primary to-ds-accent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
              New proposal
            </p>
            <h2 className="mt-1 text-base font-bold text-ds-text">
              What would you like to name this proposal?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-ds-sm p-1 text-ds-text-muted hover:text-ds-text transition-colors"
          >
            <X className="h-4 w-4" weight="bold" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DARPA I2O – Trustworthy AI Systems"
              maxLength={120}
              className="w-full border border-ds-border bg-ds-shell/60 px-3 py-2.5 font-mono text-[12px] text-ds-text placeholder:text-ds-text-subtle focus:border-ds-border-strong focus:outline-none focus:ring-1 focus:ring-ds-primary/40"
            />
            <p className="mt-1.5 font-mono text-[10px] text-ds-text-muted">
              You can rename this at any time. The BAA solicitation title will be added automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="border border-ds-border bg-transparent px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary hover:border-ds-border-strong hover:text-ds-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="inline-flex items-center gap-1.5 border border-ds-primary bg-ds-primary px-5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:brightness-110 transition-[filter] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <><CircleNotch className="h-3 w-3 animate-spin" weight="bold" /> Creating…</>
              ) : (
                <>Start <ArrowRight className="h-3 w-3" weight="bold" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function DashboardClient({ user, proposals }: DashboardClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNamingModal, setShowNamingModal] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleOpenProposal = (p: EnrichedProposal) => {
    if (p.status === 'awarded') {
      router.push(`/dashboard/projects/${p.id}/pm`);
    } else {
      router.push(`/create?id=${p.id}`);
    }
  };

  const handleDeleteProposal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from('proposals').delete().eq('id', id);
    if (!error) router.refresh();
    setDeletingId(null);
  };

  const handleStartProposal = async (name: string) => {
    const res = await fetch('/api/save-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, status: 'draft', currentStep: 'upload' }),
    });
    const data = await res.json();
    if (data?.data?.id) {
      setShowNamingModal(false);
      router.push(`/create?id=${data.data.id}`);
    }
  };

  const awarded = proposals.filter((p) => p.status === 'awarded');
  const active = proposals.filter((p) => p.status !== 'awarded');

  const deadlines14 = useMemo(
    () => active.filter((p) => isWithinNextDays(p.baaDeadline, 14)).length,
    [active],
  );

  const avgConfidence = useMemo(() => {
    const withC = active.filter((p) => typeof p.confidence === 'number') as Array<EnrichedProposal & { confidence: number }>;
    if (withC.length === 0) return 0;
    const sum = withC.reduce((acc, p) => acc + p.confidence, 0);
    return Math.round(sum / withC.length);
  }, [active]);

  // We only have collaborator counts per proposal (no identities), so this is total active collaborator rows.
  const activeCollabs = useMemo(
    () => active.reduce((acc, p) => acc + (p.collaboratorCount ?? 0), 0),
    [active],
  );

  const inReviewCount = useMemo(
    () => proposals.filter((p) => p.status === 'generated').length,
    [proposals],
  );

  return (
    <div className="flex h-screen flex-col bg-ds-page">
      {showNamingModal && (
        <NamingModal
          onClose={() => setShowNamingModal(false)}
          onStart={handleStartProposal}
        />
      )}

      <AppHeader>
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center">
            <PassBrand size="sm" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-[11px] text-ds-text-muted">{user.email}</span>
            <Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={handleLogout}>
              <SignOut className="h-3.5 w-3.5" weight="bold" />
              Log out
            </Button>
          </div>
        </div>
      </AppHeader>

      <OpsStatusBar deadlines14={deadlines14} avgConfidence={avgConfidence} activeCollabs={activeCollabs} />

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-8 max-w-7xl mx-auto">

          {/* Page header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ds-border pb-5">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                Dashboard
              </p>
              <p className="mt-1 font-mono text-[11px] text-ds-text-muted">
                {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} ·{' '}
                {awarded.length} awarded · {active.length} active
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNamingModal(true)}
              className="inline-flex h-8 items-center gap-2 border border-ds-primary bg-ds-primary px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-ds-sm hover:brightness-110 transition-[filter]"
            >
              <Plus className="h-3.5 w-3.5" weight="bold" />
              New proposal
            </button>
          </div>

          {/* Stat summary cards */}
          {proposals.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-ds-border bg-ds-surface px-5 py-4 shadow-ds-sm">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                  Total proposals
                </p>
                <p className="mt-2 text-[22px] font-medium text-ds-text">{proposals.length}</p>
                <p className="mt-1 font-mono text-[10px] text-ds-text-muted">All time</p>
              </div>

              <div className="border border-ds-border bg-ds-surface px-5 py-4 shadow-ds-sm">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                  Awarded
                </p>
                <p className="mt-2 text-[22px] font-medium text-ds-text">{awarded.length}</p>
                <p className="mt-1 font-mono text-[10px] text-ds-text-muted">
                  Win rate {proposals.length ? Math.round((awarded.length / proposals.length) * 100) : 0}%
                </p>
              </div>

              <div className="border border-ds-border bg-ds-surface px-5 py-4 shadow-ds-sm">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                  In review
                </p>
                <p className="mt-2 text-[22px] font-medium text-ds-text">{inReviewCount}</p>
                <p className="mt-1 font-mono text-[10px] text-ds-text-muted">Generated</p>
              </div>

              <div
                className={`border border-ds-border bg-ds-surface px-5 py-4 shadow-ds-sm ${
                  deadlines14 > 0 ? 'border-l-4 border-l-ds-danger' : ''
                }`}
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                  Deadlines (14d)
                </p>
                <p className="mt-2 text-[22px] font-medium text-ds-text">{deadlines14}</p>
                <p className="mt-1 font-mono text-[10px] text-ds-text-muted">Active proposals</p>
              </div>
            </div>
          )}

          {proposals.length === 0 ? (
            <div className="border border-ds-border bg-ds-surface px-10 py-16 text-center shadow-ds-md">
              <p className="mb-6 text-[15px] text-ds-text-muted">No proposals indexed yet.</p>
              <button
                type="button"
                onClick={() => setShowNamingModal(true)}
                className="inline-flex items-center gap-2 border border-ds-primary bg-ds-primary px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:brightness-110"
              >
                <Plus className="h-4 w-4" weight="bold" />
                Start first solicitation
              </button>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Active proposals */}
              {active.length > 0 && (
                <section>
                  <div className="mt-4 mb-2 flex items-center gap-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ds-text-muted">
                      Active
                    </span>
                    <span className="inline-flex items-center border border-ds-border bg-ds-shell/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ds-text-secondary rounded-[4px]">
                      {active.length}
                    </span>
                    <div className="h-px flex-1 bg-ds-border/60" aria-hidden />
                  </div>
                  <div className="border border-ds-border bg-ds-surface overflow-hidden">
                    <ProposalTable
                      proposals={active}
                      deletingId={deletingId}
                      onOpen={handleOpenProposal}
                      onDelete={handleDeleteProposal}
                    />
                  </div>
                </section>
              )}

              {/* Awarded proposals */}
              {awarded.length > 0 && (
                <section>
                  <div className="mt-4 mb-2 flex items-center gap-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-ds-text-muted flex items-center gap-1.5">
                      <Medal className="h-3 w-3 text-ds-accent" weight="bold" aria-hidden />
                      Awarded programs
                    </span>
                    <span className="inline-flex items-center border border-ds-border bg-ds-shell/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ds-text-secondary rounded-[4px]">
                      {awarded.length}
                    </span>
                    <div className="h-px flex-1 bg-ds-border/60" aria-hidden />
                  </div>
                  <div className="border border-ds-accent/30 bg-ds-surface overflow-hidden">
                    <ProposalTable
                      proposals={awarded}
                      deletingId={deletingId}
                      onOpen={handleOpenProposal}
                      onDelete={handleDeleteProposal}
                    />
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      </div>

      <AppFooter>
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-3 text-[11px] uppercase tracking-[0.06em] text-ds-text-subtle">
          <div className="flex flex-wrap gap-4">
            <span>Build v0.1.0 prototype</span>
            <span className="text-ds-border-strong">/</span>
            <span>Sandbox environment</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <span>Operational</span>
            <span className="text-ds-border-strong">/</span>
            <span suppressHydrationWarning>Updated {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </AppFooter>
    </div>
  );
}

// ── Proposal table ─────────────────────────────────────────────────────────────

function ProposalTable({
  proposals,
  deletingId,
  onOpen,
  onDelete,
}: {
  proposals: EnrichedProposal[];
  deletingId: string | null;
  onOpen: (p: EnrichedProposal) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-ds-border bg-ds-shell/50">
          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
            Proposal / Solicitation
          </th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted whitespace-nowrap">
            Status
          </th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted whitespace-nowrap">
            Confidence
          </th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted whitespace-nowrap">
            Team
          </th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted whitespace-nowrap">
            Timeline
          </th>
          <th className="px-4 py-2.5 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
            {/* action indicator */}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ds-border/60">
        {proposals.map((p) => (
          <ProposalRow
            key={p.id}
            proposal={p}
            isDeleting={deletingId === p.id}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
}

// ── Proposal row ───────────────────────────────────────────────────────────────

function ProposalRow({
  proposal: p,
  isDeleting,
  onOpen,
  onDelete,
}: {
  proposal: EnrichedProposal;
  isDeleting: boolean;
  onOpen: (p: EnrichedProposal) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  // Best timeline label
  let timelineLabel = '';
  let timelineDate = '';
  if (p.status === 'awarded' && p.period_of_performance_end) {
    timelineLabel = 'PoP ends';
    timelineDate = fmtDate(p.period_of_performance_end);
  } else if (p.baaDeadline) {
    timelineLabel = 'BAA deadline';
    timelineDate = fmtDate(p.baaDeadline);
  } else {
    timelineLabel = 'Created';
    timelineDate = fmtDate(p.created_at);
  }

  return (
    <tr
      className={`group cursor-pointer hover:bg-ds-shell/30 ${isDeleting ? 'opacity-50' : ''}`}
      onClick={() => onOpen(p)}
    >
      {/* Proposal / solicitation */}
      <td className="px-4 py-3 max-w-[28rem]">
        <p className="font-semibold text-ds-text leading-snug truncate">{p.title}</p>
        {p.baaTitle && p.baaTitle !== p.title && (
          <p className="mt-0.5 font-mono text-[10px] text-ds-text-muted truncate">
            {p.baaTitle}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {p.noticeNumber && (
            <span className="border border-ds-border bg-ds-shell/60 px-1.5 py-0.5 font-mono text-[9px] text-ds-text-muted uppercase tracking-wide">
              {p.noticeNumber}
            </span>
          )}
          {p.pdf_file_name && (
            <span className="inline-flex items-center gap-1 border border-ds-border bg-ds-shell/60 px-1.5 py-0.5 font-mono text-[9px] text-ds-text-muted truncate max-w-[20ch]">
              <FileText className="h-2.5 w-2.5 shrink-0" weight="bold" />
              {p.pdf_file_name}
            </span>
          )}
          {p.status === 'awarded' && p.total_contract_value && (
            <span className="border border-ds-accent/30 bg-ds-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-300 uppercase tracking-wide">
              ${(p.total_contract_value / 1_000_000).toFixed(1)}M
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusPill status={p.status} />
      </td>

      {/* Confidence */}
      <td className="px-4 py-3 whitespace-nowrap">
        <ConfidenceCell confidence={p.confidence} />
      </td>

      {/* Team */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-ds-text-muted" weight="bold" />
          {p.collaboratorCount > 0 ? (
            <span className="font-mono text-[11px] text-ds-text-secondary">
              {p.collaboratorCount} collab{p.collaboratorCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-ds-text-subtle">Only you</span>
          )}
        </div>
      </td>

      {/* Timeline */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted">
            {timelineLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-ds-text-secondary">
            <CalendarBlank className="h-3 w-3 text-ds-text-muted" weight="bold" aria-hidden />
            {timelineDate}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {p.status === 'awarded' ? (
            <button
              type="button"
              onClick={() => onOpen(p)}
              className="inline-flex items-center gap-1 border border-ds-border bg-transparent px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ds-text-secondary hover:border-ds-border-strong hover:text-ds-text transition-colors rounded-ds-sm"
            >
              <Medal className="h-3.5 w-3.5" weight="bold" aria-hidden />
              PM Hub
            </button>
          ) : (
            <ArrowRight className="h-3.5 w-3.5 text-ds-text-muted group-hover:text-ds-text-secondary" weight="bold" aria-hidden />
          )}
          <button
            type="button"
            title="Delete proposal"
            onClick={(e) => onDelete(p.id, e)}
            disabled={isDeleting}
            className="rounded-ds-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash className="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      </td>
    </tr>
  );
}
