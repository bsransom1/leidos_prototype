import type { SupabaseClient } from '@supabase/supabase-js';
import { addMonths, format, parseISO } from 'date-fns';
import type { BAA } from '@/types';
import type { OrganizationContextJSON } from '@/types/organization-context';
import { deletePmDataForProposal } from '@/lib/pm-seed';

export type PmProfile = 'qbi_ot' | 'materials_irad' | 'generic';

type AwardMetadata = {
  status: 'awarded';
  awarded_at: string;
  contract_number: string;
  period_of_performance_start: string;
  period_of_performance_end: string;
  total_contract_value: number;
  cost_share_amount: number;
  total_invoiced: number;
  cmmc_level: string;
  pm_profile: PmProfile;
  pm_seeded_at: string;
};

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function parseDateOrFallback(s: string | null | undefined, fallback: Date): Date {
  if (!s) return fallback;
  try {
    return parseISO(s);
  } catch {
    return fallback;
  }
}

/** Deterministic contract number: prefix + last 6 hex chars of proposalId */
function deriveContractNumber(proposalId: string, profile: PmProfile): string {
  const hex = proposalId.replace(/-/g, '').slice(-6).toUpperCase();
  if (profile === 'qbi_ot') return `HR001127C${hex}`;
  if (profile === 'materials_irad') return `FA865027R${hex}`;
  return `HR001127X${hex}`;
}

function getCmmcLevel(org: OrganizationContextJSON): string {
  return org.organization?.cmmc_certification?.level ?? 'Level 2';
}

// ── Profile resolver ─────────────────────────────────────────────────────────

export function resolvePmProfile(baa: BAA, org: OrganizationContextJSON): PmProfile {
  const notice =
    org.submission_metadata?.baa_number ??
    (baa.noticeNumbers && baa.noticeNumbers.length > 0 ? baa.noticeNumbers[0] : '') ??
    '';
  const title = baa.title ?? '';
  if (/DARPA-PA-26-02|QBI/i.test(notice) || /QBI/i.test(title)) return 'qbi_ot';
  if (/DARPA-SN-26-62/i.test(notice) || /graphene/i.test(title)) return 'materials_irad';
  return 'generic';
}

// ── Ingest loader ────────────────────────────────────────────────────────────

export async function loadProposalIngest(
  supabase: SupabaseClient,
  proposalId: string
): Promise<{ baa: BAA; org: OrganizationContextJSON }> {
  const { data, error } = await supabase
    .from('proposals')
    .select('baa_input, organization_context_json')
    .eq('id', proposalId)
    .single();

  if (error || !data) throw new Error(`Could not load proposal ingest: ${error?.message ?? 'not found'}`);
  if (!data.baa_input) throw new Error('baa_input is missing on this proposal');
  if (!data.organization_context_json) throw new Error('organization_context_json is missing on this proposal');

  const baa: BAA = JSON.parse(data.baa_input);
  const org: OrganizationContextJSON = JSON.parse(data.organization_context_json);
  return { baa, org };
}

// ── Award metadata builders ───────────────────────────────────────────────────

export function buildAwardMetadata(
  baa: BAA,
  org: OrganizationContextJSON,
  profile: PmProfile,
  proposalId: string
): AwardMetadata {
  const now = new Date();
  const fp = org.funding_plan;

  let popStart: Date;
  let popEnd: Date;
  let totalContractValue: number;
  let costShareAmount: number;

  if (profile === 'qbi_ot') {
    popStart = parseDateOrFallback(fp?.period_start_date, new Date('2027-01-01'));
    popEnd = parseDateOrFallback(fp?.period_end_date, new Date('2030-06-30'));
    totalContractValue = fp?.total_requested_usd ?? 14_250_000;
    costShareAmount = fp?.cost_share_contributed_usd ?? 950_000;
  } else if (profile === 'materials_irad') {
    popStart = parseDateOrFallback(fp?.period_start_date, new Date('2026-04-01'));
    popEnd = parseDateOrFallback(fp?.period_end_date, new Date('2026-06-30'));
    totalContractValue = fp?.total_requested_usd ?? 120_000;
    costShareAmount = fp?.cost_share_contributed_usd ?? 0;
  } else {
    const months = fp?.period_of_performance_months ?? 24;
    popStart = fp?.period_start_date ? parseDateOrFallback(fp.period_start_date, now) : now;
    popEnd = fp?.period_end_date ? parseDateOrFallback(fp.period_end_date, addMonths(popStart, months)) : addMonths(popStart, months);
    totalContractValue = fp?.total_requested_usd ?? 1_000_000;
    costShareAmount = fp?.cost_share_contributed_usd ?? 0;
  }

  // total_invoiced seeded at ~35% of Phase 1 obligated (reflects "in-progress" state)
  const phase1Fraction = profile === 'qbi_ot' ? 0.35 : profile === 'materials_irad' ? 0.6 : 0.25;
  const totalInvoiced = Math.round(totalContractValue * phase1Fraction);

  return {
    status: 'awarded',
    awarded_at: now.toISOString(),
    contract_number: deriveContractNumber(proposalId, profile),
    period_of_performance_start: fmt(popStart),
    period_of_performance_end: fmt(popEnd),
    total_contract_value: totalContractValue,
    cost_share_amount: costShareAmount,
    total_invoiced: totalInvoiced,
    cmmc_level: getCmmcLevel(org),
    pm_profile: profile,
    pm_seeded_at: now.toISOString(),
  };
}

// ── QBI OT profile seeder ─────────────────────────────────────────────────────

async function seedQbiOtProgram(
  supabase: SupabaseClient,
  proposalId: string,
  org: OrganizationContextJSON,
  awardMeta: AwardMetadata
): Promise<{ ok: boolean; error?: string }> {
  const popStart = parseISO(awardMeta.period_of_performance_start);
  const popEnd = parseISO(awardMeta.period_of_performance_end);

  const p1End = addMonths(popStart, 14);
  const p2End = addMonths(popStart, 30);

  // ── 1. Team ────────────────────────────────────────────────────────────────
  const orgName = org.organization?.legal_name || org.organization?.name || 'Heliotrope Quantum Systems';

  const teamRows = (org.team ?? []).map((m) => ({
    proposal_id: proposalId,
    name: m.name,
    org_name: orgName,
    role: m.role,
    clearance_level: m.security_clearance?.level ?? null,
  }));

  // Also add subawardee key people
  (org.subawardees_and_partners ?? []).forEach((p) => {
    if (p.poc_name) {
      teamRows.push({
        proposal_id: proposalId,
        name: p.poc_name,
        org_name: p.organization_name,
        role: p.role_description ?? 'Partner POC',
        clearance_level: p.facility_security_clearance ?? null,
      });
    }
  });

  const { data: insertedTeam, error: tmErr } = await supabase
    .from('pm_team_members')
    .insert(teamRows)
    .select('id, name');

  if (tmErr || !insertedTeam?.length) return { ok: false, error: tmErr?.message ?? 'team insert failed' };

  const ownerByName = (name: string) => insertedTeam.find((t) => t.name === name)?.id ?? null;

  // ── 2. Phases ──────────────────────────────────────────────────────────────
  const totalValue = awardMeta.total_contract_value;
  // Budget split from org funding_plan breakdown:
  // Personnel(35%) + Travel/CUI(6%) + Fee(3%) → Ph1 ≈ 44% of total
  // Cryogenic hw(24%) + Fab subcontract(20%) + Integration(12%) → Ph2 ≈ 56% but cap at total - Ph1 - Ph3
  const ph1Obligated = Math.round(totalValue * 0.35);
  const ph3Obligated = Math.round(totalValue * 0.09);
  const ph2Obligated = totalValue - ph1Obligated - ph3Obligated;

  const phases = [
    {
      proposal_id: proposalId,
      phase_number: 1,
      title: 'Stage A — USQC Concept & Feasibility',
      start_date: fmt(popStart),
      end_date: fmt(p1End),
      obligated_amount: ph1Obligated,
      invoiced_amount: awardMeta.total_invoiced,
      spent_to_date: awardMeta.total_invoiced,
      burn_rate_plan: Math.round(ph1Obligated / 14),
      status: 'active' as const,
    },
    {
      proposal_id: proposalId,
      phase_number: 2,
      title: 'Stage B — Integration Prototypes & Risk Burn-Down',
      start_date: fmt(p1End),
      end_date: fmt(p2End),
      obligated_amount: ph2Obligated,
      invoiced_amount: 0,
      spent_to_date: 0,
      burn_rate_plan: Math.round(ph2Obligated / 16),
      status: 'planned' as const,
    },
    {
      proposal_id: proposalId,
      phase_number: 3,
      title: 'Stage C — IV&V Augmentation & Verification',
      start_date: fmt(p2End),
      end_date: fmt(popEnd),
      obligated_amount: ph3Obligated,
      invoiced_amount: 0,
      spent_to_date: 0,
      burn_rate_plan: Math.round(ph3Obligated / 12),
      status: 'planned' as const,
    },
  ];

  const { data: insertedPhases, error: phErr } = await supabase
    .from('pm_phases')
    .insert(phases)
    .select('id, phase_number');

  if (phErr || !insertedPhases?.length) return { ok: false, error: phErr?.message ?? 'phases insert failed' };

  const ph1 = insertedPhases.find((p) => p.phase_number === 1);
  if (!ph1) return { ok: false, error: 'phase 1 missing' };

  // ── 3. Milestones ──────────────────────────────────────────────────────────
  // Payment amounts: total of all 6 should roughly equal ph1Obligated
  // Accepted: 3 milestones; in_progress: 1; at_risk: 1; upcoming: 1
  const msPayments = [
    Math.round(ph1Obligated * 0.12),  // ms1 accepted
    Math.round(ph1Obligated * 0.14),  // ms2 accepted
    Math.round(ph1Obligated * 0.18),  // ms3 accepted
    Math.round(ph1Obligated * 0.20),  // ms4 in_progress
    Math.round(ph1Obligated * 0.22),  // ms5 at_risk
    Math.round(ph1Obligated * 0.14),  // ms6 upcoming
  ];

  const milestones = [
    {
      phase_id: ph1.id,
      title: 'Stage A Concept Acceptance Review',
      description: 'Formal acceptance review of USQC concept brief with DARPA technical representatives. Evaluates plausibility of architecture assumptions and killer-risk identification.',
      completion_criteria: 'Acceptance review scores concept as plausible with falsifiable assumptions and identified killer risks.\n\nPayment trigger: Government acceptance of Concept Brief & Error-Budget Spreadsheet.',
      due_date: fmt(addMonths(popStart, 4)),
      payment_amount: msPayments[0],
      status: 'accepted' as const,
      owner_id: ownerByName('Dr. Marcus Chen'),
    },
    {
      phase_id: ph1.id,
      title: 'Error Budget & Architecture Baseline',
      description: 'Quantitative architecture baseline spanning cryogenic stack, control/readout, and fault-tolerance overhead — explicitly mapping assumptions to measurable subsystem envelopes.',
      completion_criteria: 'Baseline error-budget spreadsheet and falsification experiments list accepted by DARPA TPM.\n\nPayment trigger: Government acceptance of Architecture Baseline document.',
      due_date: fmt(addMonths(popStart, 7)),
      payment_amount: msPayments[1],
      status: 'accepted' as const,
      owner_id: ownerByName('Dr. Priya Singh'),
    },
    {
      phase_id: ph1.id,
      title: 'Cryogenic Interposer Alpha Demonstration',
      description: 'First hardware prototype demonstrating reduced correlated control errors in cryogenic integration. Witnessed test event with documented artifacts.',
      completion_criteria: 'Alpha prototype demonstrates measurable reduction in crosstalk relative to baseline. Independent observer statement provided.\n\nPayment trigger: Government acceptance of Alpha demonstration test report.',
      due_date: fmt(addMonths(popStart, 10)),
      payment_amount: msPayments[2],
      status: 'accepted' as const,
      owner_id: ownerByName('Dr. Marcus Chen'),
    },
    {
      phase_id: ph1.id,
      title: 'Witnessed Benchmark Regression Gate',
      description: 'Delivery of regression benchmark suite with immutable artifact hashes. IV&V team replay validation to confirm metrics within agreed tolerance bands.',
      completion_criteria: 'IV&V team can replay benchmarks from signed artifacts and reproduce key metrics within agreed tolerances.\n\nPayment trigger: Government acceptance of signed regression bundle.',
      due_date: fmt(addMonths(popStart, 11)),
      payment_amount: msPayments[3],
      status: 'in_progress' as const,
      owner_id: ownerByName('Dr. Marcus Chen'),
    },
    {
      phase_id: ph1.id,
      title: 'Cryogenic Interposer Beta — FQFF Fab Spin',
      description: 'Second fabrication spin at Flatiron Quantum Fabrication Foundry (FQFF) incorporating design-rule revisions from Alpha learnings. Wafer screening dataset feeds milestone gate.',
      completion_criteria: 'Beta interposer meets Stage B uncertainty reduction metrics. FQFF wafer screening dataset reviewed by DARPA TPM.\n\nPayment trigger: Government acceptance of Beta test report and FQFF screening data.',
      due_date: fmt(addMonths(popStart, 13)),
      payment_amount: msPayments[4],
      status: 'at_risk' as const,
      owner_id: ownerByName('Dr. Raj Kim'),
    },
    {
      phase_id: ph1.id,
      title: 'IV&V Replay Toolchain Delivery',
      description: 'Standardized benchmark harness outputs and interfaces enabling third-party IV&V validation. Replay tooling with documented tolerance budgets delivered for Government retention.',
      completion_criteria: 'Replay tooling and tolerance budget documentation accepted by IV&V team. All Stage A artifacts packaged for government archive.\n\nPayment trigger: Government acceptance of Stage A final package.',
      due_date: fmt(addMonths(popStart, 14)),
      payment_amount: msPayments[5],
      status: 'upcoming' as const,
      owner_id: ownerByName('Lisa Okonkwo'),
    },
  ];

  const { data: msRows, error: msErr } = await supabase
    .from('pm_milestones')
    .insert(milestones)
    .select('id, title');

  if (msErr || !msRows?.length) return { ok: false, error: msErr?.message ?? 'milestones insert failed' };

  const mid = (title: string) => msRows.find((m) => m.title === title)?.id;

  // ── 4. Deliverables ────────────────────────────────────────────────────────
  const deliverables = [
    {
      milestone_id: mid('Stage A Concept Acceptance Review'),
      title: 'CDRL QBI-A001 — Concept Brief & Error-Budget Spreadsheet',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 4)),
      status: 'accepted' as const,
    },
    {
      milestone_id: mid('Error Budget & Architecture Baseline'),
      title: 'CDRL QBI-A002 — Architecture Baseline & Falsification Experiment List',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 7)),
      status: 'accepted' as const,
    },
    {
      milestone_id: mid('Cryogenic Interposer Alpha Demonstration'),
      title: 'CDRL QBI-B001 — Cryogenic Interposer Alpha Test Report',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 10)),
      status: 'accepted' as const,
    },
    {
      milestone_id: mid('Witnessed Benchmark Regression Gate'),
      title: 'CDRL QBI-B002 — Signed Regression Bundle (immutable hashes)',
      type: 'software' as const,
      due_date: fmt(addMonths(popStart, 11)),
      status: 'in_progress' as const,
    },
    {
      milestone_id: mid('Cryogenic Interposer Beta — FQFF Fab Spin'),
      title: 'CDRL QBI-B003 — FQFF Wafer Screening Dataset',
      type: 'data_package' as const,
      due_date: fmt(addMonths(popStart, 13)),
      status: 'not_started' as const,
    },
    {
      milestone_id: mid('IV&V Replay Toolchain Delivery'),
      title: 'CDRL QBI-C001 — Replay Tooling & Tolerance Budget Documentation',
      type: 'software' as const,
      due_date: fmt(addMonths(popStart, 14)),
      status: 'not_started' as const,
    },
  ].filter((d) => d.milestone_id != null);

  if (deliverables.length > 0) {
    const { error: delErr } = await supabase.from('pm_deliverables').insert(deliverables);
    if (delErr) return { ok: false, error: delErr.message };
  }

  // ── 5. Risks ───────────────────────────────────────────────────────────────
  const risks = [
    {
      proposal_id: proposalId,
      title: 'CMMC Level 2 Certification Maintenance Under CUI',
      category: 'security' as const,
      probability: 3,
      impact: 4,
      mitigation: `Risk: Ongoing CMMC Level 2 compliance obligations under QBI CUI Guide may create periodic audit/reporting overhead.\n\nMitigation: ${org.compliance_and_constraints?.security_requirements?.security_plan_required ? 'Security plan in place per program requirements. ' : ''}C3PAO (${org.organization?.cmmc_certification?.c3pao_assessor ?? 'designated C3PAO'}) engaged for continuous monitoring. CUI handling procedures aligned with NIST SP 800-171.`,
      owner_id: ownerByName('Jordan Okonkwo') ?? insertedTeam[insertedTeam.length - 1]?.id ?? null,
    },
    {
      proposal_id: proposalId,
      title: 'CUI / CTI Handling Under QBI Program Guide',
      category: 'security' as const,
      probability: 3,
      impact: 4,
      mitigation: `Risk: QBI CUI Guide requirements for CTI (Controlled Technical Information) may impose data-handling overhead on IV&V artifact sharing.\n\nMitigation: ${org.compliance_and_constraints?.export_control?.plan ?? 'Technology control plan in place with role-based access and encryption for CUI-bearing datasets at rest/in transit.'}`,
      owner_id: ownerByName('Dr. Marcus Chen'),
    },
    {
      proposal_id: proposalId,
      title: 'FQFF Foundry Fab Spin Yield Risk',
      category: 'schedule' as const,
      probability: 3,
      impact: 3,
      mitigation: 'Risk: Fabrication scheduling at Flatiron Quantum Fabrication Foundry (FQFF) may slip due to shared fab capacity and design-rule iteration cycles.\n\nMitigation: Executed teaming MOU with IP and export-control flow-downs. FFP milestone structure incentivizes on-schedule delivery. Backup fab slot reserved 60 days in advance.',
      owner_id: ownerByName('Dr. Raj Kim'),
    },
    {
      proposal_id: proposalId,
      title: 'Cryogenic Crosstalk / Calibration Stability',
      category: 'technical' as const,
      probability: 4,
      impact: 3,
      mitigation: 'Risk: Correlated control errors from cryogenic wiring crosstalk may not be fully bounded until Beta prototype integration.\n\nMitigation: Stage B risk burn-down prototypes specifically target crosstalk isolation. Regression suite provides weekly stability tracking. Calibration artifacts immutably versioned for IV&V review.',
      owner_id: ownerByName('Dr. Marcus Chen'),
    },
    {
      proposal_id: proposalId,
      title: 'Key Personnel Allocation Overcommit',
      category: 'schedule' as const,
      probability: 2,
      impact: 5,
      mitigation: 'Risk: Core team members have overlapping allocation percentages that sum above 100% for critical Phase 1 windows.\n\nMitigation: Phased allocation plan reviewed quarterly. Cross-training on regression harness reduces single-person dependencies. Succession candidates identified per conflict-of-interest screening.',
      owner_id: ownerByName('Dr. Elena Vasquez') ?? insertedTeam[0]?.id ?? null,
    },
  ];

  const { error: riskErr } = await supabase.from('pm_risks').insert(risks);
  if (riskErr) return { ok: false, error: riskErr.message };

  return { ok: true };
}

// ── Materials IRAD profile seeder ─────────────────────────────────────────────

async function seedMaterialsIradProgram(
  supabase: SupabaseClient,
  proposalId: string,
  org: OrganizationContextJSON,
  awardMeta: AwardMetadata
): Promise<{ ok: boolean; error?: string }> {
  const popStart = parseISO(awardMeta.period_of_performance_start);
  const popEnd = parseISO(awardMeta.period_of_performance_end);

  const orgName = org.organization?.legal_name || org.organization?.name || 'Stratum Graphene Technologies';

  // ── 1. Team ────────────────────────────────────────────────────────────────
  const teamRows = (org.team ?? []).map((m) => ({
    proposal_id: proposalId,
    name: m.name,
    org_name: orgName,
    role: m.role,
    clearance_level: m.security_clearance?.level ?? null,
  }));

  const { data: insertedTeam, error: tmErr } = await supabase
    .from('pm_team_members')
    .insert(teamRows)
    .select('id, name');

  if (tmErr || !insertedTeam?.length) return { ok: false, error: tmErr?.message ?? 'team insert failed' };

  const ownerByName = (name: string) => insertedTeam.find((t) => t.name === name)?.id ?? null;

  // ── 2. Phases ──────────────────────────────────────────────────────────────
  const totalValue = awardMeta.total_contract_value;

  const { data: insertedPhases, error: phErr } = await supabase
    .from('pm_phases')
    .insert([{
      proposal_id: proposalId,
      phase_number: 1,
      title: 'RFI Response & Coupon Data Package',
      start_date: fmt(popStart),
      end_date: fmt(popEnd),
      obligated_amount: totalValue,
      invoiced_amount: awardMeta.total_invoiced,
      spent_to_date: awardMeta.total_invoiced,
      burn_rate_plan: Math.round(totalValue / 3),
      status: 'active' as const,
    }])
    .select('id, phase_number');

  if (phErr || !insertedPhases?.length) return { ok: false, error: phErr?.message ?? 'phases insert failed' };

  const ph1 = insertedPhases[0];

  // ── 3. Milestones from tg-rfi-geo-1..5 ────────────────────────────────────
  const goals = org.project_goals?.technical_goals ?? [];
  const rfiGoals = goals.filter((g): g is { goal_id: string; title: string; description: string; success_metric: string; deliverable_aligned: string } =>
    typeof g === 'object' && 'goal_id' in g && (g as any).goal_id?.startsWith('tg-rfi')
  );

  if (rfiGoals.length === 0) {
    return { ok: false, error: 'No tg-rfi-geo goals found in org JSON' };
  }

  const paymentSlice = Math.round(totalValue / rfiGoals.length);
  const msInserts = rfiGoals.map((g, i) => ({
    phase_id: ph1.id,
    title: g.title,
    description: g.description,
    completion_criteria: `${g.success_metric}\n\nPayment trigger: Government acceptance of ${g.deliverable_aligned}.`,
    due_date: fmt(addMonths(popStart, i + 1)),
    payment_amount: paymentSlice,
    status: (i < 2 ? 'accepted' : i < 3 ? 'in_progress' : 'upcoming') as 'accepted' | 'in_progress' | 'upcoming',
    owner_id: insertedTeam[Math.min(i, insertedTeam.length - 1)]?.id ?? null,
  }));

  const { data: msRows, error: msErr } = await supabase
    .from('pm_milestones')
    .insert(msInserts)
    .select('id, title');

  if (msErr || !msRows?.length) return { ok: false, error: msErr?.message ?? 'milestones insert failed' };

  // ── 4. Deliverables from expected_outcomes ─────────────────────────────────
  const outcomes = org.project_goals?.expected_outcomes ?? [];
  const deliverables = outcomes
    .filter((o): o is { outcome_id: string; deliverable: string; type: string } =>
      typeof o === 'object' && 'deliverable' in o
    )
    .map((o, i) => ({
      milestone_id: msRows[Math.min(i, msRows.length - 1)]?.id,
      title: o.deliverable,
      type: (['technical_report', 'software', 'demo', 'presentation', 'data_package'].includes(o.type)
        ? o.type
        : 'technical_report') as 'technical_report' | 'software' | 'demo' | 'presentation' | 'data_package',
      due_date: fmt(popEnd),
      status: 'not_started' as const,
    }))
    .filter((d) => d.milestone_id);

  if (deliverables.length > 0) {
    const { error: delErr } = await supabase.from('pm_deliverables').insert(deliverables);
    if (delErr) return { ok: false, error: delErr.message };
  }

  // ── 5. Risks ───────────────────────────────────────────────────────────────
  const risks = [
    {
      proposal_id: proposalId,
      title: 'CMMC Certification In Progress — Timeline Risk',
      category: 'security' as const,
      probability: 4,
      impact: 3,
      mitigation: `Risk: CMMC Level 2 assessment not yet completed (${org.organization?.cmmc_certification?.status ?? 'in progress'}).\n\nMitigation: C3PAO assessment scheduled. POA&M drafted for open controls. Contingency: operate under conditional status for RFI duration.`,
      owner_id: ownerByName('Kevin Porter') ?? insertedTeam[insertedTeam.length - 1]?.id ?? null,
    },
    {
      proposal_id: proposalId,
      title: 'Export Control Review for Manufacturing Process Data',
      category: 'security' as const,
      probability: 3,
      impact: 3,
      mitigation: `Risk: EAR-applicable manufacturing parameters may restrict detail disclosed in RFI response.\n\nMitigation: ${org.compliance_and_constraints?.export_control?.plan ?? 'Proprietary marking on detailed process parameters. Commercial capabilities summary segregated from controlled details.'}`,
      owner_id: ownerByName('Kevin Porter') ?? insertedTeam[insertedTeam.length - 1]?.id ?? null,
    },
    {
      proposal_id: proposalId,
      title: 'Production-Scale Roll-to-Roll Line Yield Uncertainty',
      category: 'technical' as const,
      probability: 3,
      impact: 4,
      mitigation: 'Risk: Web break rate and defect density at larger sheet widths not fully characterized at production volumes.\n\nMitigation: Factory throughput and yield observations cited with explicit uncertainty bounds. QC binning tied to mechanical test cohorts.',
      owner_id: ownerByName('Dr. Mei Li') ?? ownerByName('Dr. Samuel Okonkwo') ?? insertedTeam[0]?.id ?? null,
    },
    {
      proposal_id: proposalId,
      title: 'CNT / Nanoparticle Scope Compliance',
      category: 'technical' as const,
      probability: 1,
      impact: 5,
      mitigation: 'Risk: Any inadvertent reference to carbon nanotube or nanoparticle structural approaches would disqualify response per DARPA-SN-26-62 exclusions.\n\nMitigation: All response content reviewed for CNT exclusion compliance. Stratum roadmap explicitly excludes CNT/nanoparticle structural approaches.',
      owner_id: ownerByName('Dr. Samuel Okonkwo') ?? insertedTeam[0]?.id ?? null,
    },
  ];

  const { error: riskErr } = await supabase.from('pm_risks').insert(risks);
  if (riskErr) return { ok: false, error: riskErr.message };

  return { ok: true };
}

// ── Generic profile seeder ────────────────────────────────────────────────────

async function seedGenericFromFundingPlan(
  supabase: SupabaseClient,
  proposalId: string,
  org: OrganizationContextJSON,
  awardMeta: AwardMetadata
): Promise<{ ok: boolean; error?: string }> {
  const popStart = parseISO(awardMeta.period_of_performance_start);
  const popEnd = parseISO(awardMeta.period_of_performance_end);
  const orgName = org.organization?.legal_name || org.organization?.name || 'Organization';
  const totalValue = awardMeta.total_contract_value;

  // ── 1. Team ────────────────────────────────────────────────────────────────
  const teamRows = (org.team ?? []).slice(0, 6).map((m) => ({
    proposal_id: proposalId,
    name: m.name,
    org_name: orgName,
    role: m.role,
    clearance_level: m.security_clearance?.level ?? null,
  }));

  if (!teamRows.length) {
    const contact = org.primary_contact ?? org.technical_poc;
    if (contact?.name) {
      const contactRole = (contact as { role?: string }).role;
      teamRows.push({
        proposal_id: proposalId,
        name: contact.name,
        org_name: orgName,
        role: contactRole ?? 'PI',
        clearance_level: null,
      });
    }
  }

  const { data: insertedTeam, error: tmErr } = await supabase
    .from('pm_team_members')
    .insert(teamRows)
    .select('id, name');

  if (tmErr || !insertedTeam?.length) return { ok: false, error: tmErr?.message ?? 'team insert failed' };

  // ── 2. Phases from breakdown (up to 3) ─────────────────────────────────────
  const breakdown = org.funding_plan?.breakdown ?? [];
  const phaseCount = Math.min(3, Math.max(1, breakdown.length));
  const phaseMonths = Math.ceil(
    (popEnd.getTime() - popStart.getTime()) / (1000 * 60 * 60 * 24 * 30) / phaseCount
  );

  const phaseInserts = Array.from({ length: phaseCount }).map((_, i) => {
    const phStart = addMonths(popStart, i * phaseMonths);
    const phEnd = i === phaseCount - 1 ? popEnd : addMonths(popStart, (i + 1) * phaseMonths);
    const bk = breakdown[i];
    const obligated = bk?.amount_usd ?? Math.round(totalValue / phaseCount);
    return {
      proposal_id: proposalId,
      phase_number: i + 1,
      title: bk?.category ?? `Phase ${i + 1}`,
      start_date: fmt(phStart),
      end_date: fmt(phEnd),
      obligated_amount: obligated,
      invoiced_amount: i === 0 ? awardMeta.total_invoiced : 0,
      spent_to_date: i === 0 ? awardMeta.total_invoiced : 0,
      burn_rate_plan: Math.round(obligated / Math.max(1, phaseMonths)),
      status: (i === 0 ? 'active' : 'planned') as 'active' | 'planned',
    };
  });

  const { data: insertedPhases, error: phErr } = await supabase
    .from('pm_phases')
    .insert(phaseInserts)
    .select('id, phase_number');

  if (phErr || !insertedPhases?.length) return { ok: false, error: phErr?.message ?? 'phases insert failed' };

  const ph1 = insertedPhases[0];

  // ── 3. Milestones from technical_goals ─────────────────────────────────────
  const goals = org.project_goals?.technical_goals ?? [];
  const msInserts = goals.slice(0, 6).map((g, i) => {
    const title = typeof g === 'string' ? g : (g as any).title ?? `Milestone ${i + 1}`;
    const description = typeof g === 'string' ? '' : (g as any).description ?? '';
    const metric = typeof g === 'string' ? '' : (g as any).success_metric ?? '';
    return {
      phase_id: ph1.id,
      title,
      description,
      completion_criteria: metric || `Milestone ${i + 1} completed successfully.`,
      due_date: fmt(addMonths(popStart, Math.round((i + 1) * phaseMonths * phaseCount / (goals.length || 1)))),
      payment_amount: Math.round(ph1.phase_number === 1 ? (phaseInserts[0].obligated_amount / Math.min(goals.length, 6)) : 0),
      status: (i < 1 ? 'accepted' : i < 2 ? 'in_progress' : 'upcoming') as 'accepted' | 'in_progress' | 'upcoming',
      owner_id: insertedTeam[Math.min(i, insertedTeam.length - 1)]?.id ?? null,
    };
  });

  if (msInserts.length > 0) {
    const { error: msErr } = await supabase.from('pm_milestones').insert(msInserts);
    if (msErr) return { ok: false, error: msErr.message };
  }

  // ── 4. Risks from compliance ────────────────────────────────────────────────
  const exportApplicable = org.compliance_and_constraints?.export_control?.applicable;
  const classified = org.compliance_and_constraints?.security_requirements?.classified_work;

  const risks: Array<{
    proposal_id: string;
    title: string;
    category: 'technical' | 'schedule' | 'cost' | 'security';
    probability: number;
    impact: number;
    mitigation: string;
    owner_id: string | null;
  }> = [];

  if (exportApplicable) {
    risks.push({
      proposal_id: proposalId,
      title: 'Export Control Compliance',
      category: 'security',
      probability: 2,
      impact: 4,
      mitigation: org.compliance_and_constraints?.export_control?.plan ?? 'Export control review in progress.',
      owner_id: insertedTeam[insertedTeam.length - 1]?.id ?? null,
    });
  }

  if (classified) {
    risks.push({
      proposal_id: proposalId,
      title: 'Classified Information Handling',
      category: 'security',
      probability: 2,
      impact: 5,
      mitigation: 'Security classification guidance to be provided by Government upon award.',
      owner_id: insertedTeam[insertedTeam.length - 1]?.id ?? null,
    });
  }

  risks.push({
    proposal_id: proposalId,
    title: 'Key Personnel Availability',
    category: 'schedule',
    probability: 2,
    impact: 4,
    mitigation: 'Cross-training and succession planning in place.',
    owner_id: insertedTeam[0]?.id ?? null,
  });

  if (risks.length > 0) {
    const { error: riskErr } = await supabase.from('pm_risks').insert(risks);
    if (riskErr) return { ok: false, error: riskErr.message };
  }

  return { ok: true };
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * Primary entry point called from award route and repairPmSeedIfBroken.
 * Reads baa_input + organization_context_json, resolves profile, writes award
 * columns and all pm_* rows from actual ingest data.
 */
export async function seedPmFromIngest(
  supabase: SupabaseClient,
  proposalId: string
): Promise<{ ok: boolean; error?: string; profile?: PmProfile }> {
  // 1. Load
  let baa: BAA;
  let org: OrganizationContextJSON;
  try {
    ({ baa, org } = await loadProposalIngest(supabase, proposalId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'loadProposalIngest failed' };
  }

  // 2. Resolve profile
  const profile = resolvePmProfile(baa, org);

  // 3. Build award metadata and write to proposals row
  const awardMeta = buildAwardMetadata(baa, org, profile, proposalId);

  const { error: updErr } = await supabase
    .from('proposals')
    .update(awardMeta)
    .eq('id', proposalId);

  if (updErr) {
    // If pm_profile / pm_seeded_at columns don't exist yet (migration not applied),
    // retry with only the columns we know exist
    const fallbackMeta = {
      status: awardMeta.status,
      awarded_at: awardMeta.awarded_at,
      contract_number: awardMeta.contract_number,
      period_of_performance_start: awardMeta.period_of_performance_start,
      period_of_performance_end: awardMeta.period_of_performance_end,
      total_contract_value: awardMeta.total_contract_value,
      cost_share_amount: awardMeta.cost_share_amount,
      total_invoiced: awardMeta.total_invoiced,
      cmmc_level: awardMeta.cmmc_level,
    };
    const { error: retryErr } = await supabase
      .from('proposals')
      .update(fallbackMeta)
      .eq('id', proposalId);
    if (retryErr) return { ok: false, error: retryErr.message };
  }

  // 4. Delete stale PM rows
  const del = await deletePmDataForProposal(supabase, proposalId);
  if (!del.ok) return { ok: false, error: del.error };

  // 5. Seed profile-specific PM rows
  let seedResult: { ok: boolean; error?: string };
  if (profile === 'qbi_ot') {
    seedResult = await seedQbiOtProgram(supabase, proposalId, org, awardMeta);
  } else if (profile === 'materials_irad') {
    seedResult = await seedMaterialsIradProgram(supabase, proposalId, org, awardMeta);
  } else {
    seedResult = await seedGenericFromFundingPlan(supabase, proposalId, org, awardMeta);
  }

  return { ...seedResult, profile };
}
