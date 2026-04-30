import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, canEdit } from '@/lib/pm-access';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; deliverableId: string }> }
) {
  const { projectId, deliverableId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!canEdit(role)) return NextResponse.json({ error: 'Editors or admins only' }, { status: 403 });

  const { data: d } = await supabase.from('pm_deliverables').select('id, milestone_id').eq('id', deliverableId).single();

  if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: ms } = await supabase
    .from('pm_milestones')
    .select('phase_id')
    .eq('id', d.milestone_id)
    .single();

  if (!ms) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: ph } = await supabase.from('pm_phases').select('proposal_id').eq('id', ms.phase_id).single();

  if (!ph || ph.proposal_id !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { title, type, dueDate, status, fileUrl } = body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (type !== undefined) updates.type = type;
  if (dueDate !== undefined) updates.due_date = dueDate;
  if (status !== undefined) updates.status = status;
  if (fileUrl !== undefined) updates.file_url = fileUrl;

  const { data: row, error } = await supabase
    .from('pm_deliverables')
    .update(updates)
    .eq('id', deliverableId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deliverable: row });
}
