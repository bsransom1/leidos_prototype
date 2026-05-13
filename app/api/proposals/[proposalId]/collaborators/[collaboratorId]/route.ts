import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';

const COLLAB_ROLES = ['viewer', 'editor', 'admin'] as const;

function normalizeRole(value: unknown): (typeof COLLAB_ROLES)[number] {
  if (typeof value !== 'string') return 'viewer';
  const r = value.toLowerCase();
  return (COLLAB_ROLES as readonly string[]).includes(r) ? (r as (typeof COLLAB_ROLES)[number]) : 'viewer';
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string; collaboratorId: string }> }
) {
  try {
    const { proposalId, collaboratorId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pmRole = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
    if (!isAdmin(pmRole)) {
      return NextResponse.json({ error: 'Only proposal admins can change collaborator roles.' }, { status: 403 });
    }

    const body = await request.json();
    const role = normalizeRole(body.role);

    const { data: row, error: fetchErr } = await supabase
      .from('proposal_collaborators')
      .select('id, proposal_id')
      .eq('id', collaboratorId)
      .maybeSingle();

    if (fetchErr || !row || row.proposal_id !== proposalId) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('proposal_collaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .eq('proposal_id', proposalId)
      .select()
      .single();

    if (updateErr) {
      console.error('Update collaborator role:', updateErr);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        createdAt: updated.created_at,
        acceptedAt: updated.accepted_at,
      },
    });
  } catch (e) {
    console.error('PATCH collaborator:', e);
    return NextResponse.json({ error: 'Failed to update collaborator' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ proposalId: string; collaboratorId: string }> }
) {
  try {
    const { proposalId, collaboratorId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pmRole = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
    if (!isAdmin(pmRole)) {
      return NextResponse.json({ error: 'Only proposal admins can remove collaborators.' }, { status: 403 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from('proposal_collaborators')
      .select('id, proposal_id, email')
      .eq('id', collaboratorId)
      .maybeSingle();

    if (fetchErr || !row || row.proposal_id !== proposalId) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from('proposal_collaborators')
      .delete()
      .eq('id', collaboratorId)
      .eq('proposal_id', proposalId);

    if (delErr) {
      console.error('Delete collaborator:', delErr);
      return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE collaborator:', e);
    return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
  }
}
