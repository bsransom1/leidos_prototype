import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';

export async function DELETE(
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
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'Only proposal admins can delete.' }, { status: 403 });
    }

    const { error } = await supabase.from('proposals').delete().eq('id', proposalId);

    if (error) {
      console.error('Delete proposal error:', error);
      return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE proposal:', e);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
