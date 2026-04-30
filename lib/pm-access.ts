import type { SupabaseClient } from '@supabase/supabase-js';

export type PmRole = 'admin' | 'editor' | 'viewer' | null;

/**
 * Resolve PM RBAC for a proposal: owner = admin; collaborators by role.
 */
export async function getPmRole(
  supabase: SupabaseClient,
  userId: string | undefined,
  userEmail: string | undefined,
  proposalId: string
): Promise<PmRole> {
  if (!userId) return null;

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('user_id')
    .eq('id', proposalId)
    .single();

  if (error || !proposal) return null;
  if (proposal.user_id === userId) return 'admin';

  if (!userEmail) return null;

  const { data: collab } = await supabase
    .from('proposal_collaborators')
    .select('role')
    .eq('proposal_id', proposalId)
    .ilike('email', userEmail)
    .eq('status', 'accepted')
    .maybeSingle();

  if (!collab?.role) return null;
  if (collab.role === 'admin') return 'admin';
  if (collab.role === 'editor') return 'editor';
  return 'viewer';
}

export function canEdit(role: PmRole): boolean {
  return role === 'admin' || role === 'editor';
}

export function isAdmin(role: PmRole): boolean {
  return role === 'admin';
}
