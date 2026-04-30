import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';

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

  const { data: risks } = await supabase
    .from('pm_risks')
    .select('*')
    .eq('proposal_id', projectId)
    .order('created_at', { ascending: false });

  const scored = (risks ?? []).map((r) => ({
    ...r,
    score: r.probability * r.impact,
  }));

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ risks: scored, role });
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
  if (!isAdmin(role)) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const body = await request.json();
  const { title, category, probability, impact, mitigation, ownerId } = body;

  if (!title || !category || probability == null || impact == null) {
    return NextResponse.json({ error: 'title, category, probability, impact required' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('pm_risks')
    .insert({
      proposal_id: projectId,
      title,
      category,
      probability: Number(probability),
      impact: Number(impact),
      mitigation: mitigation ?? '',
      owner_id: ownerId ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ risk: row });
}
