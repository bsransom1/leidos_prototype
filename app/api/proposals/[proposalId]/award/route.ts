import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole } from '@/lib/pm-access';
import { ensurePmSeedForAwardedProposal } from '@/lib/pm-seed';
import { addMonths, subMonths } from 'date-fns';
import type { PostgrestError } from '@supabase/supabase-js';
import { isPostgrestMissingColumnError } from '@/lib/postgrest-helpers';

function jsonFromPostgrestError(err: PostgrestError) {
  return {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  };
}

function awardMetadataRow(now: Date) {
  const popStart = subMonths(now, 6);
  const popEnd = addMonths(now, 30);
  return {
    status: 'awarded' as const,
    awarded_at: now.toISOString(),
    contract_number: 'HR001126C0042',
    period_of_performance_start: popStart.toISOString().slice(0, 10),
    period_of_performance_end: popEnd.toISOString().slice(0, 10),
    total_contract_value: 4_750_000,
    cost_share_amount: 0,
    total_invoiced: 1_240_000,
    cmmc_level: 'Level 2',
  };
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Only program admins can mark a proposal as awarded.' }, { status: 403 });
    }

    const { data: proposal, error: fetchErr } = await supabase
      .from('proposals')
      .select('id, status, generated_output')
      .eq('id', proposalId)
      .single();

    if (fetchErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.generated_output) {
      return NextResponse.json({ error: 'Proposal must be generated before award.' }, { status: 400 });
    }

    const now = new Date();
    const popStart = subMonths(now, 6);
    const popEnd = addMonths(now, 30);
    const contractNumber = 'HR001126C0042';

    const fullAwardRow = awardMetadataRow(now);

    let awardMetadataPartial = false;
    let updErr = (await supabase.from('proposals').update(fullAwardRow).eq('id', proposalId)).error;

    if (updErr) {
      console.error('[award] full proposals update failed', jsonFromPostgrestError(updErr));
      const isMissingColumn = isPostgrestMissingColumnError(updErr);

      if (isMissingColumn) {
        const minimal = { status: 'awarded' as const };
        const retry = await supabase.from('proposals').update(minimal).eq('id', proposalId);
        updErr = retry.error;
        if (!updErr) {
          awardMetadataPartial = true;
          console.warn(
            '[award] applied status-only award; run supabase/migration_pm_post_award.sql for contract + PM tables'
          );
        }
      }

      if (updErr) {
        console.error('[award] proposals update failed (after fallback)', jsonFromPostgrestError(updErr));
        return NextResponse.json(
          {
            error: updErr.message,
            ...jsonFromPostgrestError(updErr),
            hint:
              updErr.code === '42501'
                ? 'Row-level security blocked the update. Ensure you own the proposal or apply PM migration policies.'
                : 'If you see a missing-column error, run supabase/migration_pm_post_award.sql in the Supabase SQL editor.',
          },
          { status: 500 }
        );
      }
    }

    const seed = await ensurePmSeedForAwardedProposal(supabase, proposalId, {
      contractNumber,
      popStart,
      popEnd,
    });

    if (!seed.ok) {
      return NextResponse.json(
        {
          error: 'Award saved but PM seed failed',
          details: seed.error,
          awardMetadataPartial,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectTo: `/dashboard/projects/${proposalId}/pm`,
      awardMetadataPartial,
    });
  } catch (e) {
    console.error('[award] unhandled error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
