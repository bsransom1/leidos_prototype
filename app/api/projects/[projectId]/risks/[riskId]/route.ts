import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; riskId: string }> }
) {
  const { projectId, riskId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!isAdmin(role)) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const { data: existing } = await supabase
    .from('pm_risks')
    .select('id')
    .eq('id', riskId)
    .eq('proposal_id', projectId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) =>
      ['title', 'category', 'probability', 'impact', 'mitigation', 'owner_id'].includes(k)
    )
  );

  const { data: row, error } = await supabase
    .from('pm_risks')
    .update(updates)
    .eq('id', riskId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ risk: row });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; riskId: string }> }
) {
  const { projectId, riskId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getPmRole(supabase, user.id, user.email ?? undefined, projectId);
  if (!isAdmin(role)) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const { error } = await supabase.from('pm_risks').delete().eq('id', riskId).eq('proposal_id', projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
