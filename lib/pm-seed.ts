import type { SupabaseClient } from '@supabase/supabase-js';
import { addMonths, format } from 'date-fns';

/**
 * After award, create PM structure + HR001126-style demo data if tables are empty.
 */
export async function ensurePmSeedForAwardedProposal(
  supabase: SupabaseClient,
  proposalId: string,
  options: {
    contractNumber: string;
    popStart: Date;
    popEnd: Date;
    totalValue: number;
    phaseIObligated: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from('pm_phases')
    .select('id')
    .eq('proposal_id', proposalId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: true };
  }

  const { data: tm, error: tmErr } = await supabase
    .from('pm_team_members')
    .insert({
      proposal_id: proposalId,
      name: 'Program Manager (Prime)',
      org_name: 'Prime Contractor',
      role: 'Program Manager',
      clearance_level: 'TS/SCI',
    })
    .select('id')
    .single();

  if (tmErr || !tm) {
    return { ok: false, error: tmErr?.message ?? 'team member' };
  }

  const p1Start = options.popStart;
  const p1End = addMonths(p1Start, 6);
  const p2End = addMonths(p1End, 12);
  const p3End = addMonths(p2End, 18);

  const phases = [
    {
      proposal_id: proposalId,
      phase_number: 1,
      title: 'Phase I — Base effort',
      start_date: format(p1Start, 'yyyy-MM-dd'),
      end_date: format(p1End, 'yyyy-MM-dd'),
      obligated_amount: options.phaseIObligated,
      spent_to_date: 0,
      invoiced_amount: 0,
      burn_rate_plan: options.phaseIObligated / 6,
      status: 'active' as const,
    },
    {
      proposal_id: proposalId,
      phase_number: 2,
      title: 'Phase II — Option',
      start_date: format(addMonths(p1End, 1), 'yyyy-MM-dd'),
      end_date: format(p2End, 'yyyy-MM-dd'),
      obligated_amount: 800000,
      spent_to_date: 0,
      invoiced_amount: 0,
      burn_rate_plan: 66666,
      status: 'planned' as const,
    },
    {
      proposal_id: proposalId,
      phase_number: 3,
      title: 'Phase III — Follow-on',
      start_date: format(addMonths(p2End, 1), 'yyyy-MM-dd'),
      end_date: format(p3End, 'yyyy-MM-dd'),
      obligated_amount: 1200000,
      spent_to_date: 0,
      invoiced_amount: 0,
      burn_rate_plan: 66666,
      status: 'planned' as const,
    },
  ];

  const { data: insertedPhases, error: phErr } = await supabase
    .from('pm_phases')
    .insert(phases)
    .select('id, phase_number');

  if (phErr || !insertedPhases?.length) {
    return { ok: false, error: phErr?.message ?? 'phases' };
  }

  const phase1 = insertedPhases.find((p) => p.phase_number === 1);
  if (!phase1) return { ok: false, error: 'phase1' };

  const milestones = [
    {
      phase_id: phase1.id,
      title: 'M1 — Program kickoff & I2O alignment',
      description: 'Establish technical baseline and I2O office interfaces.',
      completion_criteria:
        'Signed program plan; monthly status reporting cadence established; risk register baselined.',
      due_date: format(addMonths(p1Start, 2), 'yyyy-MM-dd'),
      payment_amount: 80000,
      status: 'in_progress' as const,
      owner_id: tm.id,
    },
    {
      phase_id: phase1.id,
      title: 'M2 — Initial capability release',
      description: 'Deliver integrated prototype with traceability to BAA objectives.',
      completion_criteria:
        'Demonstration of end-to-end workflow; test artifacts; stakeholder review complete.',
      due_date: format(addMonths(p1Start, 4), 'yyyy-MM-dd'),
      payment_amount: 120000,
      status: 'upcoming' as const,
      owner_id: tm.id,
    },
    {
      phase_id: phase1.id,
      title: 'M3 — Security & data handling review',
      description: 'CMMC-aligned posture for handling CUI and export-controlled artifacts.',
      completion_criteria:
        'Security assessment package; data flow diagrams; POA&M for any findings.',
      due_date: format(addMonths(p1Start, 5), 'yyyy-MM-dd'),
      payment_amount: 100000,
      status: 'upcoming' as const,
      owner_id: tm.id,
    },
    {
      phase_id: phase1.id,
      title: 'M4 — Phase I report & go/no-go package',
      description: 'Final report and transition criteria for Phase II option.',
      completion_criteria:
        'Final technical report; independent assessment; go/no-go recommendation with evidence.',
      due_date: format(p1End, 'yyyy-MM-dd'),
      payment_amount: 100000,
      status: 'upcoming' as const,
      owner_id: tm.id,
    },
  ];

  const { data: ms, error: msErr } = await supabase.from('pm_milestones').insert(milestones).select('id');

  if (msErr || !ms?.length) {
    return { ok: false, error: msErr?.message ?? 'milestones' };
  }

  await supabase.from('pm_deliverables').insert([
    {
      milestone_id: ms[0].id,
      title: 'CDRL-A001: Program Management Plan',
      type: 'technical_report' as const,
      due_date: format(addMonths(p1Start, 1), 'yyyy-MM-dd'),
      status: 'in_progress' as const,
    },
    {
      milestone_id: ms[1].id,
      title: 'CDRL-B002: Software drop',
      type: 'software' as const,
      due_date: format(addMonths(p1Start, 4), 'yyyy-MM-dd'),
      status: 'not_started' as const,
    },
  ]);

  await supabase.from('pm_risks').insert([
    {
      proposal_id: proposalId,
      title: 'Integration risk with legacy C2 systems',
      category: 'technical' as const,
      probability: 7,
      impact: 9,
      mitigation: 'Spiral integration with early interface control documents; dedicated test harness.',
      owner_id: tm.id,
    },
    {
      proposal_id: proposalId,
      title: 'Subcontractor availability for key personnel',
      category: 'schedule' as const,
      probability: 6,
      impact: 7,
      mitigation: 'Backfill bench; overlap transition periods; executive escalation path.',
      owner_id: tm.id,
    },
  ]);

  return { ok: true };
}
