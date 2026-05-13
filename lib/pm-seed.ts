import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, addMonths, format, parseISO, subMonths } from 'date-fns';

/** Passed from award route / reseed; all PoP dates are relative to `new Date()` at call time. */
export type PmSeedOptions = {
  contractNumber: string;
  popStart: Date;
  popEnd: Date;
};

export type PmSeedProposalDates = {
  contract_number: string | null;
  period_of_performance_start: string | null;
  period_of_performance_end: string | null;
};

/** Build seed date options from proposal award columns (falls back to rolling PoP window). */
export function pmSeedOptionsFromProposalDates(proposal: PmSeedProposalDates): PmSeedOptions {
  const now = new Date();
  const popStart = proposal.period_of_performance_start
    ? parseISO(proposal.period_of_performance_start)
    : subMonths(now, 6);
  const popEnd = proposal.period_of_performance_end
    ? parseISO(proposal.period_of_performance_end)
    : addMonths(now, 30);
  return {
    contractNumber: proposal.contract_number ?? 'HR001126C0042',
    popStart,
    popEnd,
  };
}

/**
 * If PM rows are missing or clearly broken (phases without milestones), delete and insert demo seed.
 * Used when opening the PM hub so a prior partial seed cannot strand the dashboard on empty data.
 */
export async function repairPmSeedIfBroken(
  supabase: SupabaseClient,
  proposalId: string,
  proposal: PmSeedProposalDates
): Promise<{ ok: boolean; repaired: boolean; error?: string }> {
  const { data: phases, error: phErr } = await supabase
    .from('pm_phases')
    .select('id')
    .eq('proposal_id', proposalId);

  if (phErr) return { ok: false, repaired: false, error: phErr.message };

  const phaseIds = (phases ?? []).map((p) => p.id);
  let milestoneCount = 0;
  if (phaseIds.length) {
    const { count, error: cErr } = await supabase
      .from('pm_milestones')
      .select('*', { count: 'exact', head: true })
      .in('phase_id', phaseIds);
    if (cErr) return { ok: false, repaired: false, error: cErr.message };
    milestoneCount = count ?? 0;
  }

  const needsRepair = phaseIds.length === 0 || milestoneCount === 0;
  if (!needsRepair) return { ok: true, repaired: false };

  const del = await deletePmDataForProposal(supabase, proposalId);
  if (!del.ok) return { ok: false, repaired: false, error: del.error };

  const options = pmSeedOptionsFromProposalDates(proposal);
  const ins = await insertLeidosPmDemoSeed(supabase, proposalId, options);
  if (!ins.ok) return { ok: false, repaired: true, error: ins.error };
  return { ok: true, repaired: true };
}

/**
 * Remove all PM rows for a proposal (phases cascade milestones; delete children first for safety).
 */
export async function deletePmDataForProposal(
  supabase: SupabaseClient,
  proposalId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: phases, error: phErr } = await supabase
    .from('pm_phases')
    .select('id')
    .eq('proposal_id', proposalId);

  if (phErr) return { ok: false, error: phErr.message };

  const phaseIds = (phases ?? []).map((p) => p.id);
  if (phaseIds.length) {
    const { data: milestones, error: msErr } = await supabase
      .from('pm_milestones')
      .select('id')
      .in('phase_id', phaseIds);

    if (msErr) return { ok: false, error: msErr.message };

    const milestoneIds = (milestones ?? []).map((m) => m.id);
    if (milestoneIds.length) {
      const { error: d1 } = await supabase.from('pm_deliverables').delete().in('milestone_id', milestoneIds);
      if (d1) return { ok: false, error: d1.message };
      const { error: d2 } = await supabase.from('pm_milestone_assignments').delete().in('milestone_id', milestoneIds);
      if (d2) return { ok: false, error: d2.message };
      const { error: d3 } = await supabase.from('pm_milestone_events').delete().in('milestone_id', milestoneIds);
      if (d3) return { ok: false, error: d3.message };
    }

    const { error: msDel } = await supabase.from('pm_milestones').delete().in('phase_id', phaseIds);
    if (msDel) return { ok: false, error: msDel.message };
  }

  const { error: rDel } = await supabase.from('pm_risks').delete().eq('proposal_id', proposalId);
  if (rDel) return { ok: false, error: rDel.message };

  const { error: phDel } = await supabase.from('pm_phases').delete().eq('proposal_id', proposalId);
  if (phDel) return { ok: false, error: phDel.message };

  const { error: tmDel } = await supabase.from('pm_team_members').delete().eq('proposal_id', proposalId);
  if (tmDel) return { ok: false, error: tmDel.message };

  return { ok: true };
}

/**
 * Insert Leidos / DARPA I2O-style PM demo data (full replace — caller must delete first for reseed).
 */
export async function insertLeidosPmDemoSeed(
  supabase: SupabaseClient,
  proposalId: string,
  options: PmSeedOptions
): Promise<{ ok: boolean; error?: string }> {
  const popStart = options.popStart;
  const popEnd = options.popEnd;
  const p1End = addMonths(popStart, 10);
  const p2End = addMonths(popStart, 22);

  const teamRows = [
    {
      proposal_id: proposalId,
      name: 'Dr. Alexandra Martinez',
      org_name: 'Leidos Inc.',
      role: 'Principal Investigator (40% program effort)',
      clearance_level: 'Secret',
    },
    {
      proposal_id: proposalId,
      name: 'Braden Ransom',
      org_name: 'Leidos Inc.',
      role: 'Lead Research Engineer (100% program effort)',
      clearance_level: 'Secret',
    },
    {
      proposal_id: proposalId,
      name: 'Jordan Lee',
      org_name: 'Leidos Inc.',
      role: 'Systems Engineer (75% program effort)',
      clearance_level: 'Confidential',
    },
    {
      proposal_id: proposalId,
      name: 'Avery Chen',
      org_name: 'UC Irvine — Subawardee',
      role: 'AI Research Scientist (60% program effort)',
      clearance_level: 'Secret',
    },
  ];

  const { data: insertedTeam, error: tmErr } = await supabase
    .from('pm_team_members')
    .insert(teamRows)
    .select('id, name');

  if (tmErr || !insertedTeam?.length) {
    return { ok: false, error: tmErr?.message ?? 'team insert' };
  }

  const owner = (name: string) => insertedTeam.find((t) => t.name === name)?.id ?? null;

  const phases = [
    {
      proposal_id: proposalId,
      phase_number: 1,
      title: 'Phase I — Foundation & Prototype Development',
      start_date: format(popStart, 'yyyy-MM-dd'),
      end_date: format(p1End, 'yyyy-MM-dd'),
      obligated_amount: 1_800_000,
      invoiced_amount: 1_240_000,
      spent_to_date: 1_240_000,
      burn_rate_plan: 180_000,
      status: 'active' as const,
    },
    {
      proposal_id: proposalId,
      phase_number: 2,
      title: 'Phase II — System Integration & Testing',
      start_date: format(p1End, 'yyyy-MM-dd'),
      end_date: format(p2End, 'yyyy-MM-dd'),
      obligated_amount: 1_950_000,
      invoiced_amount: 0,
      spent_to_date: 0,
      burn_rate_plan: 162_500,
      status: 'planned' as const,
    },
    {
      proposal_id: proposalId,
      phase_number: 3,
      title: 'Phase III — Transition & Demonstration',
      start_date: format(p2End, 'yyyy-MM-dd'),
      end_date: format(popEnd, 'yyyy-MM-dd'),
      obligated_amount: 1_000_000,
      invoiced_amount: 0,
      spent_to_date: 0,
      burn_rate_plan: 125_000,
      status: 'planned' as const,
    },
  ];

  const { data: insertedPhases, error: phErr } = await supabase
    .from('pm_phases')
    .insert(phases)
    .select('id, phase_number');

  if (phErr || !insertedPhases?.length) {
    return { ok: false, error: phErr?.message ?? 'phases insert' };
  }

  const phase1 = insertedPhases.find((p) => p.phase_number === 1);
  if (!phase1) return { ok: false, error: 'phase1 missing' };

  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  const milestones = [
    {
      phase_id: phase1.id,
      title: 'System Requirements Review (SRR)',
      description:
        'Formal review of all Level 1 and Level 2 system requirements with DARPA technical representatives.',
      completion_criteria:
        'DARPA TPM sign-off on requirements baseline document. All Level 1 requirements traced to BAA thrust areas.\n\nPayment trigger: Government acceptance of SRR package',
      due_date: fmt(addMonths(popStart, 2)),
      payment_amount: 180_000,
      status: 'accepted' as const,
      owner_id: owner('Dr. Alexandra Martinez'),
    },
    {
      phase_id: phase1.id,
      title: 'Preliminary Design Review (PDR)',
      description:
        'Architecture and design review covering AI inference pipeline, data ingestion subsystem, and secure enclave configuration.',
      completion_criteria:
        'DARPA approval of PDR briefing. No Category 1 open items.\n\nPayment trigger: Government acceptance of PDR briefing package',
      due_date: fmt(addMonths(popStart, 4)),
      payment_amount: 220_000,
      status: 'accepted' as const,
      owner_id: owner('Dr. Alexandra Martinez'),
    },
    {
      phase_id: phase1.id,
      title: 'Prototype Delivery — Alpha',
      description:
        'Delivery of functional Alpha prototype demonstrating core Transformative AI pipeline on classified test dataset.',
      completion_criteria:
        'System processes test dataset end-to-end with >80% throughput target. Delivery to DARPA test environment.\n\nPayment trigger: Government acceptance of Alpha prototype and test report',
      due_date: fmt(addMonths(popStart, 6)),
      payment_amount: 340_000,
      status: 'accepted' as const,
      owner_id: owner('Braden Ransom'),
    },
    {
      phase_id: phase1.id,
      title: 'Critical Design Review (CDR)',
      description:
        'Full system CDR covering integration architecture, cybersecurity plan, and Phase II readiness.',
      completion_criteria:
        'DARPA TPM approval. CMMC Level 2 self-assessment posted to SPRS prior to review.\n\nPayment trigger: Government acceptance of CDR package',
      due_date: fmt(addMonths(popStart, 8)),
      payment_amount: 260_000,
      status: 'in_progress' as const,
      owner_id: owner('Jordan Lee'),
    },
    {
      phase_id: phase1.id,
      title: 'Prototype Delivery — Beta',
      description:
        'Delivery of Beta prototype with full feature set and initial red-team security assessment complete.',
      completion_criteria:
        'Beta system meets all PDR-baselined requirements. Security assessment findings addressed or documented.\n\nPayment trigger: Government acceptance of Beta prototype and security report',
      due_date: fmt(addMonths(popStart, 10)),
      payment_amount: 380_000,
      status: 'upcoming' as const,
      owner_id: owner('Braden Ransom'),
    },
    {
      phase_id: phase1.id,
      title: 'Phase I Final Report',
      description:
        'Comprehensive Phase I technical report documenting all findings, lessons learned, and Phase II execution plan.',
      completion_criteria:
        'DARPA acceptance of final report. Phase II kickoff meeting scheduled.\n\nPayment trigger: Government acceptance of Phase I Final Report',
      due_date: fmt(addDays(addMonths(popStart, 10), 14)),
      payment_amount: 160_000,
      status: 'upcoming' as const,
      owner_id: owner('Dr. Alexandra Martinez'),
    },
  ];

  const { data: msRows, error: msErr } = await supabase
    .from('pm_milestones')
    .insert(milestones)
    .select('id, title');

  if (msErr || !msRows?.length) {
    return { ok: false, error: msErr?.message ?? 'milestones insert' };
  }

  const mid = (title: string) => msRows.find((m) => m.title === title)?.id;
  const idSrr = mid('System Requirements Review (SRR)');
  const idPdr = mid('Preliminary Design Review (PDR)');
  const idAlpha = mid('Prototype Delivery — Alpha');
  const idCdr = mid('Critical Design Review (CDR)');

  if (!idSrr || !idPdr || !idAlpha || !idCdr) {
    return { ok: false, error: 'milestone id map failed' };
  }

  const deliverables = [
    {
      milestone_id: idSrr,
      title: 'System Requirements Document (SRD) — CDRL A001 — baseline per DI-IPSC-81431A',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 2)),
      status: 'accepted' as const,
    },
    {
      milestone_id: idPdr,
      title: 'Preliminary Design Document (PDD) — CDRL A002 — per DI-SESS-81785',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 4)),
      status: 'accepted' as const,
    },
    {
      milestone_id: idAlpha,
      title: 'Alpha Test Report — CDRL A003 — performance metrics for Alpha prototype',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 6)),
      status: 'accepted' as const,
    },
    {
      milestone_id: idCdr,
      title: 'Critical Design Document (CDD) — CDRL A004 — per DI-SESS-81786',
      type: 'technical_report' as const,
      due_date: fmt(addMonths(popStart, 8)),
      status: 'in_progress' as const,
    },
  ];

  const { error: delErr } = await supabase.from('pm_deliverables').insert(deliverables);
  if (delErr) return { ok: false, error: delErr.message };

  const risks = [
    {
      proposal_id: proposalId,
      title: 'CMMC Level 2 Certification Delay',
      category: 'security' as const,
      probability: 3,
      impact: 4,
      mitigation:
        'Risk: C3PAO assessment scheduling backlog may delay certification required for Phase II classified data access.\n\nMitigation: Initiated C3PAO engagement 90 days early. POA&M drafted for two open controls. Contingency: operate under conditional status through Phase II start.',
      owner_id: owner('Jordan Lee'),
    },
    {
      proposal_id: proposalId,
      title: 'Key Personnel Departure',
      category: 'schedule' as const,
      probability: 2,
      impact: 5,
      mitigation:
        'Risk: Loss of Principal Investigator or Lead Engineer would significantly impact Phase II delivery timeline.\n\nMitigation: Retention bonuses approved for key personnel through Phase II. Cross-training program initiated. Succession candidates identified.',
      owner_id: owner('Dr. Alexandra Martinez'),
    },
    {
      proposal_id: proposalId,
      title: '[Mitigated] Classified Compute Access Latency',
      category: 'technical' as const,
      probability: 4,
      impact: 3,
      mitigation:
        'Risk: JWICS-connected HPC allocation delays have historically impacted similar DARPA programs by 4–8 weeks.\n\nMitigation: Reserved compute time blocks 60 days in advance. Unclassified surrogate dataset approved for development use.',
      owner_id: owner('Avery Chen'),
    },
    {
      proposal_id: proposalId,
      title: 'Subcontractor Deliverable Slippage',
      category: 'schedule' as const,
      probability: 3,
      impact: 3,
      mitigation:
        'Risk: UC Irvine subawardee deliverable dependency on Beta prototype creates schedule risk if academic calendar conflicts arise.\n\nMitigation: Monthly coordination calls established. SOW includes 2-week float on all subawardee deliverables. Backup internal resource identified.',
      owner_id: owner('Braden Ransom'),
    },
  ];

  const { error: riskErr } = await supabase.from('pm_risks').insert(risks);
  if (riskErr) return { ok: false, error: riskErr.message };

  return { ok: true };
}

/**
 * After award: always replace PM rows with the current demo seed so a stale/partial
 * `pm_phases` row cannot block the new dataset (that was the empty-dashboard failure mode).
 */
export async function ensurePmSeedForAwardedProposal(
  supabase: SupabaseClient,
  proposalId: string,
  options: PmSeedOptions
): Promise<{ ok: boolean; error?: string }> {
  const del = await deletePmDataForProposal(supabase, proposalId);
  if (!del.ok) return del;
  return insertLeidosPmDemoSeed(supabase, proposalId, options);
}
