import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, canEdit } from '@/lib/pm-access';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const { projectId, milestoneId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!canEdit(role)) {
    return NextResponse.json({ error: 'Editors or admins only' }, { status: 403 });
  }

  const { data: ms } = await supabase
    .from('pm_milestones')
    .select('id, status, phase_id')
    .eq('id', milestoneId)
    .single();

  if (!ms) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: ph } = await supabase
    .from('pm_phases')
    .select('proposal_id')
    .eq('id', ms.phase_id)
    .single();

  if (!ph || ph.proposal_id !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { status, title, description, completionCriteria, dueDate, paymentAmount, ownerId } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (completionCriteria !== undefined) updates.completion_criteria = completionCriteria;
  if (dueDate !== undefined) updates.due_date = dueDate;
  if (paymentAmount !== undefined) updates.payment_amount = paymentAmount;
  if (ownerId !== undefined) updates.owner_id = ownerId;

  const oldStatus = ms.status;

  const { data: updated, error } = await supabase
    .from('pm_milestones')
    .update(updates)
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status !== undefined && status !== oldStatus) {
    await supabase.from('pm_milestone_events').insert({
      milestone_id: milestoneId,
      old_status: oldStatus,
      new_status: status,
      changed_by: user.id,
    });
  }

  return NextResponse.json({ milestone: updated });
}
