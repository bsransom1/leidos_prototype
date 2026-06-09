import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole } from '@/lib/pm-access';
import { seedPmFromIngest } from '@/lib/pm-seed-from-ingest';

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
      .select('id, status, generated_output, baa_input, organization_context_json')
      .eq('id', proposalId)
      .single();

    if (fetchErr || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.generated_output) {
      return NextResponse.json({ error: 'Proposal must be generated before award.' }, { status: 400 });
    }

    // Defensive guards — the create flow always populates both fields before award is possible,
    // but we guard here to surface a clear message if something unexpected occurs.
    if (!proposal.baa_input) {
      return NextResponse.json({ error: 'BAA data is missing. Re-upload the solicitation PDF before awarding.' }, { status: 400 });
    }
    if (!proposal.organization_context_json) {
      return NextResponse.json({ error: 'Organization context is missing. Re-upload the org context JSON before awarding.' }, { status: 400 });
    }

    // First mark status as awarded so repairPmSeedIfBroken won't interfere mid-flight.
    const { error: statusErr } = await supabase
      .from('proposals')
      .update({ status: 'awarded' })
      .eq('id', proposalId);

    if (statusErr) {
      return NextResponse.json({ error: statusErr.message }, { status: 500 });
    }

    // Seed all PM rows and award metadata from ingest data.
    const seed = await seedPmFromIngest(supabase, proposalId);

    if (!seed.ok) {
      return NextResponse.json(
        {
          error: 'Award saved but PM seed failed',
          details: seed.error,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectTo: `/dashboard/projects/${proposalId}/pm`,
      pm_profile: seed.profile,
    });
  } catch (e) {
    console.error('[award] unhandled error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
