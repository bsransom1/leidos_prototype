'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  format,
  parseISO,
} from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  SquaresFour,
  Flag,
  Wallet,
  ShieldWarning,
  Warning,
  FileText,
} from '@phosphor-icons/react';

type Tab = 'overview' | 'milestones' | 'budget' | 'risks';

type OverviewPayload = {
  proposal: {
    title?: string;
    contractNumber: string | null;
    popStart: string | null;
    popEnd: string | null;
    cmmcLevel: string | null;
    daysRemaining: number;
    totalContractValue: number | null;
    costShare: number | null;
  };
  metrics: {
    totalMilestones: number;
    accepted: number;
    atRisk: number;
    missed: number;
    burnRateActual: number;
    burnRatePlan: number;
    daysToNextMilestone: number | null;
  };
  phaseProgress: Array<{
    phaseNumber: number;
    title: string;
    percentAccepted: number;
    status: string;
    start: string;
    end: string;
  }>;
  upcomingMilestones: Array<{
    id: string;
    title: string;
    phase: string;
    dueDate: string;
    paymentAmount: number;
    status: string;
    ownerName: string;
  }>;
  role: string;
};

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  upcoming: '#bebfbd',
  in_progress: '#0033a0',
  submitted: '#eab308',
  accepted: '#059669',
  at_risk: '#f97316',
  missed: '#dc2626',
};

const DELIVERABLE_STATUS: Record<string, string> = {
  not_started: 'border border-gray-200 bg-gray-100 text-gray-500',
  in_progress: 'border border-blue-300 bg-blue-50 text-blue-700',
  submitted: 'border border-amber-300 bg-amber-50 text-amber-700',
  accepted: 'border border-emerald-300 bg-emerald-50 text-emerald-700',
  overdue: 'border border-red-300 bg-red-50 text-red-600',
};

export default function PmDashboardClient({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [milestonesPayload, setMilestonesPayload] = useState<{
    phases: Array<{ id: string; phase_number: number; title: string; start_date: string; end_date: string }>;
    milestones: Array<Record<string, unknown>>;
    deliverablesByMilestone: Record<string, Array<Record<string, unknown>>>;
    role: string;
  } | null>(null);
  const [budget, setBudget] = useState<{
    phases: Array<{
      phaseNumber: number;
      title: string;
      obligated: number;
      invoiced: number;
      remaining: number;
      burnRatePlan: number;
      health: string;
    }>;
    totals: { obligated: number; invoiced: number; remaining: number };
    proposal: { totalContractValue: number; costShare: number };
    role: string;
  } | null>(null);
  const [risksPayload, setRisksPayload] = useState<{
    risks: Array<{
      id: string;
      title: string;
      category: string;
      probability: number;
      impact: number;
      mitigation: string | null;
      score: number;
    }>;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const base = `/api/projects/${projectId}`;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [o, m, b, r] = await Promise.all([
        fetch(`${base}/pm/overview`).then((x) => x.json()),
        fetch(`${base}/milestones`).then((x) => x.json()),
        fetch(`${base}/budget`).then((x) => x.json()),
        fetch(`${base}/risks`).then((x) => x.json()),
      ]);
      if (o.error) throw new Error(o.error);
      setOverview(o);
      setMilestonesPayload(m);
      setBudget(b);
      setRisksPayload(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const role = overview?.role ?? milestonesPayload?.role ?? 'viewer';
  const canEdit = role === 'admin' || role === 'editor';
  const isAdmin = role === 'admin';

  const budgetChartData = useMemo(() => {
    if (!budget?.phases) return [];
    return budget.phases.map((p) => ({
      name: `Ph ${p.phaseNumber}`,
      obligated: p.obligated,
      invoiced: p.invoiced,
      remaining: p.remaining,
    }));
  }, [budget]);

  const ganttRows = useMemo(() => {
    if (!milestonesPayload?.milestones || !milestonesPayload.phases) return [];
    const phaseMap = new Map(milestonesPayload.phases.map((p) => [p.id, p]));
    return milestonesPayload.milestones.map((m) => {
      const ph = phaseMap.get(m.phase_id as string);
      const start = ph ? parseISO(ph.start_date) : new Date();
      const end = ph ? parseISO(ph.end_date) : new Date();
      const due = parseISO(m.due_date as string);
      const totalMs = end.getTime() - start.getTime();
      const pos = Math.min(1, Math.max(0, (due.getTime() - start.getTime()) / (totalMs || 1)));
      return {
        id: m.id as string,
        title: m.title as string,
        phaseTitle: ph?.title ?? '',
        due: m.due_date as string,
        status: m.status as string,
        pos,
        start,
        end,
      };
    });
  }, [milestonesPayload]);

  const [riskForm, setRiskForm] = useState({
    title: '',
    category: 'technical',
    probability: 5,
    impact: 5,
    mitigation: '',
  });

  const [newMs, setNewMs] = useState({
    phaseId: '',
    title: '',
    dueDate: '',
    paymentAmount: '0',
    completionCriteria: '',
  });

  useEffect(() => {
    if (milestonesPayload?.phases?.length) {
      setNewMs((s) => (s.phaseId ? s : { ...s, phaseId: milestonesPayload.phases[0].id }));
    }
  }, [milestonesPayload]);

  const addMilestone = async () => {
    if (!canEdit || !newMs.phaseId || !newMs.title || !newMs.dueDate) return;
    const res = await fetch(`${base}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phaseId: newMs.phaseId,
        title: newMs.title,
        dueDate: newMs.dueDate,
        paymentAmount: Number(newMs.paymentAmount) || 0,
        completionCriteria: newMs.completionCriteria,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      alert(j.error ?? 'Failed');
      return;
    }
    setNewMs((s) => ({ ...s, title: '', dueDate: '', paymentAmount: '0', completionCriteria: '' }));
    load();
  };

  const addRisk = async () => {
    if (!isAdmin) return;
    const res = await fetch(`${base}/risks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(riskForm),
    });
    const j = await res.json();
    if (!res.ok) {
      alert(j.error ?? 'Failed');
      return;
    }
    setRiskForm({ title: '', category: 'technical', probability: 5, impact: 5, mitigation: '' });
    load();
  };

  if (loading && !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ds-page">
        <p className="text-sm text-ds-text-muted">Loading program dashboard…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ds-page">
        <p className="text-sm text-red-600">{err}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ds-page flex flex-col">
      <header className="shrink-0 border-b border-ds-border bg-ds-header/90 backdrop-blur-sm">
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-ds-text-muted hover:text-ds-text transition-colors shrink-0" title="Back to dashboard">
              <ArrowLeft className="w-4 h-4" weight="bold" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-ds-text truncate">{title}</h1>
              <p className="text-xs text-ds-text-muted">
                Post-award PM • {overview?.proposal.contractNumber ?? '—'} • CMMC{' '}
                {overview?.proposal.cmmcLevel ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/proposal/${projectId}`}
              className="inline-flex items-center gap-1.5 border border-ds-border bg-ds-shell/60 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary hover:border-ds-border-strong hover:text-ds-text transition-colors"
              title="View original proposal document"
            >
              <FileText className="w-3 h-3" weight="bold" />
              Proposal Doc
              <ArrowRight className="w-3 h-3" weight="bold" />
            </Link>
            <span className="border border-emerald-300 bg-emerald-50 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
              Awarded
            </span>
          </div>
        </div>
        <nav className="px-6 flex gap-1 border-t border-ds-border">
          {(
            [
              ['overview', 'Overview', SquaresFour],
              ['milestones', 'Milestones & Deliverables', Flag],
              ['budget', 'Budget', Wallet],
              ['risks', 'Risk Register', ShieldWarning],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px ${
                tab === id
                  ? 'border-ds-primary text-ds-text'
                  : 'border-transparent text-ds-text-muted hover:text-ds-text-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" weight="bold" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {tab === 'overview' && overview && (
          <div className="space-y-6 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Days remaining (PoP)" value={String(overview.proposal.daysRemaining)} />
              <StatCard label="Milestones accepted" value={`${overview.metrics.accepted} / ${overview.metrics.totalMilestones}`} />
              <StatCard label="At risk" value={String(overview.metrics.atRisk)} />
              <StatCard
                label="Days to next milestone"
                value={overview.metrics.daysToNextMilestone != null ? String(overview.metrics.daysToNextMilestone) : '—'}
              />
            </div>

            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm p-4">
              <h2 className="text-xs font-semibold text-ds-text-secondary mb-3">Phase progress (% milestones accepted)</h2>
              <div className="space-y-2">
                {overview.phaseProgress.map((ph) => (
                  <div key={ph.phaseNumber}>
                    <div className="flex justify-between text-xs text-ds-text-muted mb-1">
                      <span>
                        Phase {ph.phaseNumber}: {ph.title}
                      </span>
                      <span>{ph.percentAccepted}%</span>
                    </div>
                    <div className="h-2 bg-ds-shell/70 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/80 transition-all"
                        style={{ width: `${ph.percentAccepted}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm overflow-hidden">
              <h2 className="text-xs font-semibold text-ds-text-secondary px-4 py-2 border-b border-ds-border">
                Upcoming milestones
              </h2>
              <table className="w-full text-xs">
                <thead className="bg-ds-shell/60">
                  <tr>
                    <th className="text-left px-3 py-2">Title</th>
                    <th className="text-left px-3 py-2">Phase</th>
                    <th className="text-left px-3 py-2">Due</th>
                    <th className="text-right px-3 py-2">Payment</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.upcomingMilestones.map((m) => (
                    <tr key={m.id} className="border-t border-ds-border">
                      <td className="px-3 py-2 font-medium text-ds-text">{m.title}</td>
                      <td className="px-3 py-2 text-ds-text-muted">{m.phase}</td>
                      <td className="px-3 py-2">{format(parseISO(m.dueDate), 'MMM d, yyyy')}</td>
                      <td className="px-3 py-2 text-right mono">${m.paymentAmount.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] border"
                          style={{
                            borderColor: MILESTONE_STATUS_COLORS[m.status] ?? '#bebfbd',
                            color: MILESTONE_STATUS_COLORS[m.status] ?? '#53565a',
                          }}
                        >
                          {m.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2">{m.ownerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'milestones' && milestonesPayload && (
          <div className="max-w-6xl space-y-6">
            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm p-4">
              <h2 className="text-xs font-semibold mb-3">Timeline (milestone due dates within phase bounds)</h2>
              <div className="space-y-3">
                {ganttRows.map((row) => (
                  <div key={row.id}>
                    <div className="flex justify-between text-xs text-ds-text-muted mb-1">
                      <span className="font-medium text-ds-text">{row.title}</span>
                      <span>{format(parseISO(row.due), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="h-3 bg-ds-shell/65 relative rounded">
                      <div
                        className="absolute top-0 h-3 rounded"
                        style={{
                          left: `${row.pos * 100}%`,
                          width: '4px',
                          marginLeft: '-2px',
                          background: MILESTONE_STATUS_COLORS[row.status] ?? '#53565a',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-ds-text-subtle mt-0.5">{row.phaseTitle}</p>
                  </div>
                ))}
              </div>
            </div>

            {canEdit && milestonesPayload.phases.length > 0 && (
              <div className="space-y-4 rounded-ds-md border border-dashed border-ds-border/55 bg-ds-surface/70 p-5">
                <h3 className="text-xs font-semibold text-ds-text-secondary">Add milestone</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <select
                    className="border border-ds-border px-2 py-1"
                    value={newMs.phaseId}
                    onChange={(e) => setNewMs((s) => ({ ...s, phaseId: e.target.value }))}
                  >
                    {milestonesPayload.phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        Phase {p.phase_number}: {p.title}
                      </option>
                    ))}
                  </select>
                  <input
                    className="border border-ds-border px-2 py-1"
                    placeholder="Title"
                    value={newMs.title}
                    onChange={(e) => setNewMs((s) => ({ ...s, title: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="border border-ds-border px-2 py-1"
                    value={newMs.dueDate}
                    onChange={(e) => setNewMs((s) => ({ ...s, dueDate: e.target.value }))}
                  />
                  <input
                    className="border border-ds-border px-2 py-1"
                    placeholder="Payment trigger ($)"
                    value={newMs.paymentAmount}
                    onChange={(e) => setNewMs((s) => ({ ...s, paymentAmount: e.target.value }))}
                  />
                  <textarea
                    className="border border-ds-border px-2 py-1 md:col-span-2"
                    placeholder="Completion criteria"
                    rows={2}
                    value={newMs.completionCriteria}
                    onChange={(e) => setNewMs((s) => ({ ...s, completionCriteria: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="rounded-ds-sm border border-emerald-800/60 bg-emerald-900/45 px-3 py-1.5 text-xs font-semibold text-emerald-50 shadow-ds-sm hover:brightness-110"
                >
                  Add Milestone
                </button>
              </div>
            )}

            <div className="space-y-4">
              {milestonesPayload.milestones.map((m) => {
                const dels = milestonesPayload.deliverablesByMilestone[m.id as string] ?? [];
                return (
                  <div key={m.id as string} className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-ds-text">{m.title as string}</h3>
                        <p className="text-xs text-ds-text-muted mt-1">{m.description as string}</p>
                        <p className="text-xs text-ds-text-secondary mt-2">
                          <span className="font-medium">Completion criteria:</span> {m.completion_criteria as string}
                        </p>
                      </div>
                      {canEdit && (
                        <select
                          className="rounded-ds-sm border border-ds-border bg-ds-page px-2 py-1.5 text-xs text-ds-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ds-page"
                          value={m.status as string}
                          onChange={async (e) => {
                            const res = await fetch(`${base}/milestones/${m.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: e.target.value }),
                            });
                            if (res.ok) load();
                          }}
                        >
                          {['upcoming', 'in_progress', 'submitted', 'accepted', 'at_risk', 'missed'].map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-ds-text-secondary mb-2">Deliverables</h4>
                      <ul className="space-y-1">
                        {dels.map((d) => (
                          <li
                            key={d.id as string}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs border border-ds-border px-2 py-1.5"
                          >
                            <span>{d.title as string}</span>
                            <span className={`px-1.5 py-0.5 rounded ${DELIVERABLE_STATUS[d.status as string] ?? ''}`}>
                              {d.status as string}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'budget' && budget && (
          <div className="max-w-6xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard label="Total obligated" value={`$${budget.totals.obligated.toLocaleString()}`} />
              <StatCard label="Invoiced (sum phases)" value={`$${budget.totals.invoiced.toLocaleString()}`} />
              <StatCard label="Remaining" value={`$${budget.totals.remaining.toLocaleString()}`} />
            </div>
            {budget.proposal.costShare > 0 && (
              <p className="text-xs text-ds-text-muted">
                Cost-share: ${budget.proposal.costShare.toLocaleString()}
              </p>
            )}
            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm p-4 h-80">
              <h2 className="text-xs font-semibold mb-2">Funding by phase</h2>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={budgetChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: unknown) => (typeof value === 'number' ? `$${value.toLocaleString()}` : `${value ?? ''}`)} />
                  <Legend />
                  <Bar dataKey="invoiced" stackId="a" fill="#0033a0" name="Invoiced" />
                  <Bar dataKey="remaining" stackId="a" fill="#53565a" name="Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-ds-shell/60">
                  <tr>
                    <th className="text-left px-3 py-2">Phase</th>
                    <th className="text-right px-3 py-2">Obligated</th>
                    <th className="text-right px-3 py-2">Invoiced</th>
                    <th className="text-right px-3 py-2">Remaining</th>
                    <th className="text-left px-3 py-2">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.phases.map((p) => (
                    <tr key={p.phaseNumber} className="border-t border-ds-border">
                      <td className="px-3 py-2">{p.title}</td>
                      <td className="px-3 py-2 text-right mono">${p.obligated.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right mono">${p.invoiced.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right mono">${p.remaining.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            p.health === 'green'
                              ? 'text-emerald-600'
                              : p.health === 'yellow'
                                ? 'text-amber-600'
                                : 'text-red-500'
                          }
                        >
                          {p.health}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'risks' && risksPayload && (
          <div className="max-w-6xl space-y-6">
            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm p-4">
              <h2 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Warning className="h-4 w-4 text-red-400" weight="bold" />
                Risk matrix (probability × impact)
              </h2>
              <div className="relative w-full max-w-md aspect-square border border-ds-border mx-auto">
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-ds-border/40" />
                  ))}
                </div>
                {risksPayload.risks.map((r) => (
                  <div
                    key={r.id}
                    title={r.title}
                    className="absolute w-3 h-3 rounded-full border-2 border-white shadow"
                    style={{
                      left: `calc(${(r.impact - 0.5) * 10}% - 6px)`,
                      bottom: `calc(${(r.probability - 0.5) * 10}% - 6px)`,
                      background: r.score >= 49 ? '#dc2626' : r.score >= 25 ? '#f97316' : '#0033a0',
                    }}
                  />
                ))}
                <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-ds-text-muted">
                  Impact →
                </div>
                <div className="absolute -left-6 top-0 bottom-0 flex items-center text-[10px] text-ds-text-muted">
                  <span className="-rotate-90">Probability</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm p-4 space-y-2">
                <h3 className="text-xs font-semibold">Add risk (admin)</h3>
                <input
                  className="w-full text-xs border border-ds-border px-2 py-1"
                  placeholder="Title"
                  value={riskForm.title}
                  onChange={(e) => setRiskForm((s) => ({ ...s, title: e.target.value }))}
                />
                <div className="flex gap-2 flex-wrap">
                  <select
                    className="text-xs border border-ds-border px-2 py-1"
                    value={riskForm.category}
                    onChange={(e) => setRiskForm((s) => ({ ...s, category: e.target.value }))}
                  >
                    {['technical', 'schedule', 'cost', 'security'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <label className="text-xs flex items-center gap-1">
                    P
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="w-12 border border-ds-border px-1"
                      value={riskForm.probability}
                      onChange={(e) =>
                        setRiskForm((s) => ({ ...s, probability: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="text-xs flex items-center gap-1">
                    I
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="w-12 border border-ds-border px-1"
                      value={riskForm.impact}
                      onChange={(e) => setRiskForm((s) => ({ ...s, impact: Number(e.target.value) }))}
                    />
                  </label>
                </div>
                <textarea
                  className="w-full text-xs border border-ds-border px-2 py-1"
                  placeholder="Mitigation"
                  rows={2}
                  value={riskForm.mitigation}
                  onChange={(e) => setRiskForm((s) => ({ ...s, mitigation: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={addRisk}
                  className="rounded-ds-sm border border-ds-primary bg-ds-primary px-3 py-1.5 text-xs font-semibold text-white shadow-ds-sm hover:brightness-110"
                >
                  Add Risk
                </button>
              </div>
            )}

            <div className="rounded-ds-md border border-ds-border bg-ds-surface shadow-ds-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-ds-shell/60">
                  <tr>
                    <th className="text-left px-3 py-2">Title</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-right px-3 py-2">P</th>
                    <th className="text-right px-3 py-2">I</th>
                    <th className="text-right px-3 py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {risksPayload.risks.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-ds-border ${r.score >= 49 ? 'bg-red-50 ring-2 ring-red-300' : ''}`}
                    >
                      <td className="px-3 py-2 font-medium">{r.title}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2 text-right">{r.probability}</td>
                      <td className="px-3 py-2 text-right">{r.impact}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ds-md border border-ds-border bg-ds-surface px-4 py-3 shadow-ds-sm">
      <p className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-ds-text">{value}</p>
    </div>
  );
}
