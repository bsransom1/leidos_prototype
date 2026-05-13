import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, canEdit } from '@/lib/pm-access';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: phases } = await supabase
    .from('pm_phases')
    .select('id, phase_number, title, start_date, end_date')
    .eq('proposal_id', projectId)
    .order('phase_number');

  const ids = (phases ?? []).map((p) => p.id);
  if (!ids.length) {
    return NextResponse.json({
      phases: [],
      milestones: [],
      deliverablesByMilestone: {},
      role,
    });
  }

  const { data: milestones } = await supabase
    .from('pm_milestones')
    .select('*')
    .in('phase_id', ids)
    .order('due_date');

  const mIds = (milestones ?? []).map((m) => m.id);
  const { data: deliverables } =
    mIds.length > 0
      ? await supabase.from('pm_deliverables').select('*').in('milestone_id', mIds)
      : { data: [] as never[] };

  const delByMs = new Map<string, typeof deliverables>();
  for (const d of deliverables ?? []) {
    const list = delByMs.get(d.milestone_id) ?? [];
    list.push(d);
    delByMs.set(d.milestone_id, list);
  }

  return NextResponse.json({
    phases: phases ?? [],
    milestones: milestones ?? [],
    deliverablesByMilestone: Object.fromEntries(delByMs),
    role,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!canEdit(role)) {
    return NextResponse.json({ error: 'Editors or admins only' }, { status: 403 });
  }

  const body = await request.json();
  const {
    phaseId,
    title,
    description,
    completionCriteria,
    dueDate,
    paymentAmount,
    status,
    ownerId,
  } = body;

  if (!phaseId || !title || !dueDate) {
    return NextResponse.json({ error: 'phaseId, title, dueDate required' }, { status: 400 });
  }

  const { data: phase, error: pe } = await supabase
    .from('pm_phases')
    .select('id')
    .eq('id', phaseId)
    .eq('proposal_id', projectId)
    .single();

  if (pe || !phase) {
    return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('pm_milestones')
    .insert({
      phase_id: phaseId,
      title,
      description: description ?? '',
      completion_criteria: completionCriteria ?? '',
      due_date: dueDate,
      payment_amount: paymentAmount ?? 0,
      status: status ?? 'upcoming',
      owner_id: ownerId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestone: row });
}
