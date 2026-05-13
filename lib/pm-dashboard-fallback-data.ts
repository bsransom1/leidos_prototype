import { addDays, addMonths, subMonths } from 'date-fns';

/** Stable demo ids (not DB UUIDs) — UI only when API returns no PM rows */
export const PM_DEMO_PREFIX = 'demo-pm';

export type PmFallbackOverview = {
  proposal: {
    title?: string;
    contractNumber: string | null;
    popStart: string | null;
    popEnd: string | null;
    cmmcLevel: string | null;
    daysRemaining: number | null;
    popCompleted?: boolean;
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

export type PmFallbackMilestones = {
  phases: Array<{ id: string; phase_number: number; title: string; start_date: string; end_date: string }>;
  milestones: Array<Record<string, unknown>>;
  deliverablesByMilestone: Record<string, Array<Record<string, unknown>>>;
  role: string;
};

export type PmFallbackBudget = {
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
};

export type PmFallbackRisks = {
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
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Full PM dashboard payloads for demo / when API returns empty PM tables.
 * Dates are relative to `now` (call from client after mount).
 */
export function buildPmDashboardFallbackData(
  now: Date,
  opts: { projectTitle: string; role?: string }
): {
  overview: PmFallbackOverview;
  milestones: PmFallbackMilestones;
  budget: PmFallbackBudget;
  risks: PmFallbackRisks;
} {
  const role = opts.role ?? 'admin';
  const popStart = subMonths(now, 6);
  const popEnd = addMonths(now, 30);
  const p1End = addMonths(popStart, 10);
  const p2End = addMonths(popStart, 22);

  const ph1 = `${PM_DEMO_PREFIX}-ph-1`;
  const ph2 = `${PM_DEMO_PREFIX}-ph-2`;
  const ph3 = `${PM_DEMO_PREFIX}-ph-3`;

  const milestonesRaw: Array<{
    id: string;
    phase_id: string;
    title: string;
    description: string;
    completion_criteria: string;
    due_date: string;
    payment_amount: number;
    status: string;
    owner_id: string | null;
  }> = [
    {
      id: `${PM_DEMO_PREFIX}-ms-1`,
      phase_id: ph1,
      title: 'System Requirements Review (SRR)',
      description: 'Formal review of Level 1 and Level 2 system requirements with DARPA technical representatives.',
      completion_criteria:
        'DARPA TPM sign-off on requirements baseline. Payment trigger: Government acceptance of SRR package.',
      due_date: iso(addMonths(popStart, 2)),
      payment_amount: 180_000,
      status: 'accepted',
      owner_id: null,
    },
    {
      id: `${PM_DEMO_PREFIX}-ms-2`,
      phase_id: ph1,
      title: 'Preliminary Design Review (PDR)',
      description: 'Architecture review: AI inference pipeline, data ingestion, secure enclave configuration.',
      completion_criteria:
        'DARPA approval of PDR briefing; no Category 1 open items. Payment trigger: Government acceptance of PDR package.',
      due_date: iso(addMonths(popStart, 4)),
      payment_amount: 220_000,
      status: 'accepted',
      owner_id: null,
    },
    {
      id: `${PM_DEMO_PREFIX}-ms-3`,
      phase_id: ph1,
      title: 'Prototype Delivery — Alpha',
      description: 'Alpha prototype on classified test dataset.',
      completion_criteria:
        '>80% throughput target; delivery to DARPA test environment. Payment trigger: Government acceptance of Alpha.',
      due_date: iso(addMonths(popStart, 6)),
      payment_amount: 340_000,
      status: 'accepted',
      owner_id: null,
    },
    {
      id: `${PM_DEMO_PREFIX}-ms-4`,
      phase_id: ph1,
      title: 'Critical Design Review (CDR)',
      description: 'Full system CDR: integration architecture, cybersecurity, Phase II readiness.',
      completion_criteria:
        'DARPA TPM approval; CMMC Level 2 self-assessment on SPRS. Payment trigger: Government acceptance of CDR package.',
      due_date: iso(addMonths(popStart, 8)),
      payment_amount: 260_000,
      status: 'in_progress',
      owner_id: null,
    },
    {
      id: `${PM_DEMO_PREFIX}-ms-5`,
      phase_id: ph1,
      title: 'Prototype Delivery — Beta',
      description: 'Beta prototype with red-team security assessment.',
      completion_criteria:
        'Meets PDR baseline; security findings addressed. Payment trigger: Government acceptance of Beta.',
      due_date: iso(p1End),
      payment_amount: 380_000,
      status: 'at_risk',
      owner_id: null,
    },
    {
      id: `${PM_DEMO_PREFIX}-ms-6`,
      phase_id: ph1,
      title: 'Phase I Final Report',
      description: 'Phase I technical report and Phase II plan.',
      completion_criteria: 'DARPA acceptance; Phase II kickoff scheduled.',
      due_date: iso(addDays(p1End, 14)),
      payment_amount: 160_000,
      status: 'upcoming',
      owner_id: null,
    },
  ];

  const milestones = milestonesRaw as unknown as Array<Record<string, unknown>>;

  const deliverablesByMilestone: Record<string, Array<Record<string, unknown>>> = {
    [`${PM_DEMO_PREFIX}-ms-1`]: [
      {
        id: `${PM_DEMO_PREFIX}-d-1`,
        milestone_id: `${PM_DEMO_PREFIX}-ms-1`,
        title: 'CDRL A001 — System Requirements Document (SRD)',
        status: 'accepted',
        type: 'technical_report',
        due_date: milestonesRaw[0].due_date,
        description: 'Baseline per DI-IPSC-81431A',
      },
    ],
    [`${PM_DEMO_PREFIX}-ms-2`]: [
      {
        id: `${PM_DEMO_PREFIX}-d-2`,
        milestone_id: `${PM_DEMO_PREFIX}-ms-2`,
        title: 'CDRL A002 — Preliminary Design Document (PDD)',
        status: 'accepted',
        type: 'technical_report',
        due_date: milestonesRaw[1].due_date,
        description: 'Per DI-SESS-81785',
      },
    ],
    [`${PM_DEMO_PREFIX}-ms-3`]: [
      {
        id: `${PM_DEMO_PREFIX}-d-3`,
        milestone_id: `${PM_DEMO_PREFIX}-ms-3`,
        title: 'CDRL A003 — Alpha Test Report',
        status: 'accepted',
        type: 'technical_report',
        due_date: milestonesRaw[2].due_date,
        description: 'Performance metrics for Alpha prototype',
      },
    ],
    [`${PM_DEMO_PREFIX}-ms-4`]: [
      {
        id: `${PM_DEMO_PREFIX}-d-4`,
        milestone_id: `${PM_DEMO_PREFIX}-ms-4`,
        title: 'CDRL A004 — Critical Design Document (CDD)',
        status: 'in_progress',
        type: 'technical_report',
        due_date: milestonesRaw[3].due_date,
        description: 'Per DI-SESS-81786',
      },
    ],
  };

  const phases: PmFallbackMilestones['phases'] = [
    {
      id: ph1,
      phase_number: 1,
      title: 'Foundation & Prototype Development',
      start_date: iso(popStart),
      end_date: iso(p1End),
    },
    {
      id: ph2,
      phase_number: 2,
      title: 'System Integration & Testing',
      start_date: iso(p1End),
      end_date: iso(p2End),
    },
    {
      id: ph3,
      phase_number: 3,
      title: 'Transition & Demonstration',
      start_date: iso(p2End),
      end_date: iso(popEnd),
    },
  ];

  const upcomingMilestones = milestonesRaw
    .filter((m) => new Date(m.due_date) >= now || ['upcoming', 'in_progress', 'at_risk'].includes(m.status))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .map((m) => ({
      id: m.id,
      title: m.title,
      phase: 'Foundation & Prototype Development',
      dueDate: m.due_date,
      paymentAmount: m.payment_amount,
      status: m.status,
      ownerName: 'Dr. Alexandra Martinez',
    }));

  const daysRemaining = Math.max(0, Math.ceil((popEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const overview: PmFallbackOverview = {
    proposal: {
      title: opts.projectTitle,
      contractNumber: 'HR001126C0042',
      popStart: iso(popStart),
      popEnd: iso(popEnd),
      cmmcLevel: 'Level 2',
      daysRemaining,
      popCompleted: false,
      totalContractValue: 4_750_000,
      costShare: 0,
    },
    metrics: {
      totalMilestones: 6,
      accepted: 3,
      atRisk: 1,
      missed: 0,
      burnRateActual: 118_000,
      burnRatePlan: 165_000,
      daysToNextMilestone: Math.max(
        0,
        Math.ceil((new Date(milestonesRaw[3].due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      ),
    },
    phaseProgress: [
      {
        phaseNumber: 1,
        title: 'Foundation & Prototype Development',
        percentAccepted: 50,
        status: 'active',
        start: iso(popStart),
        end: iso(p1End),
      },
      {
        phaseNumber: 2,
        title: 'System Integration & Testing',
        percentAccepted: 0,
        status: 'planned',
        start: iso(p1End),
        end: iso(p2End),
      },
      {
        phaseNumber: 3,
        title: 'Transition & Demonstration',
        percentAccepted: 0,
        status: 'planned',
        start: iso(p2End),
        end: iso(popEnd),
      },
    ],
    upcomingMilestones,
    role,
  };

  const budget: PmFallbackBudget = {
    phases: [
      {
        phaseNumber: 1,
        title: 'Foundation & Prototype Development',
        obligated: 1_800_000,
        invoiced: 1_240_000,
        remaining: 560_000,
        burnRatePlan: 180_000,
        health: 'green',
      },
      {
        phaseNumber: 2,
        title: 'System Integration & Testing',
        obligated: 1_950_000,
        invoiced: 0,
        remaining: 1_950_000,
        burnRatePlan: 162_500,
        health: 'green',
      },
      {
        phaseNumber: 3,
        title: 'Transition & Demonstration',
        obligated: 1_000_000,
        invoiced: 0,
        remaining: 1_000_000,
        burnRatePlan: 125_000,
        health: 'green',
      },
    ],
    totals: {
      obligated: 4_750_000,
      invoiced: 1_240_000,
      remaining: 3_510_000,
    },
    proposal: { totalContractValue: 4_750_000, costShare: 0 },
    role,
  };

  const risks: PmFallbackRisks['risks'] = [
    {
      id: `${PM_DEMO_PREFIX}-r-1`,
      title: 'CMMC Level 2 Certification Delay',
      category: 'security',
      probability: 3,
      impact: 4,
      score: 12,
      mitigation: 'C3PAO engaged early; POA&M drafted.',
    },
    {
      id: `${PM_DEMO_PREFIX}-r-2`,
      title: 'Key Personnel Departure',
      category: 'schedule',
      probability: 2,
      impact: 5,
      score: 10,
      mitigation: 'Retention bonuses; succession plan.',
    },
    {
      id: `${PM_DEMO_PREFIX}-r-3`,
      title: '[Mitigated] Classified Compute Access Latency',
      category: 'technical',
      probability: 4,
      impact: 3,
      score: 12,
      mitigation: 'Reserved HPC blocks; surrogate dataset for dev.',
    },
    {
      id: `${PM_DEMO_PREFIX}-r-4`,
      title: 'Subcontractor Deliverable Slippage',
      category: 'schedule',
      probability: 3,
      impact: 3,
      score: 9,
      mitigation: 'Monthly UCI calls; float in SOW.',
    },
  ];

  risks.sort((a, b) => b.score - a.score);

  return {
    overview,
    milestones: {
      phases,
      milestones,
      deliverablesByMilestone,
      role,
    },
    budget,
    risks: { risks, role },
  };
}

export function isPmDemoEntityId(id: string): boolean {
  return id.startsWith(PM_DEMO_PREFIX);
}
