import { createClient } from '@/lib/supabase/server';
import SharedProposalView from './shared-proposal-client';

export default async function SharedProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Get collaborator by token (allow both pending and accepted)
  const { data: collaborator, error: collaboratorError } = await supabase
    .from('proposal_collaborators')
    .select('*, proposals(*)')
    .eq('invitation_token', token)
    .in('status', ['pending', 'accepted'])
    .single();

  if (collaboratorError || !collaborator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e8eaed] px-4">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wide text-blue-700">P.A.S.S.</p>
          <p className="text-[10px] text-gray-500">Shared proposal</p>
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-900">Invalid or expired invitation</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              This invitation link is invalid, has expired, or has already been used. Contact the proposal owner to request a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Mark invitation as accepted if user is logged in with matching email
  const { data: { user } } = await supabase.auth.getUser();
  let isAuthenticated = false;

  if (user && user.email?.toLowerCase() === collaborator.email.toLowerCase()) {
    isAuthenticated = true;
    // Accept invitation server-side via RPC (RLS-safe). Ignore failures here; the workspace
    // route will still resolve role via the accepted row if already accepted.
    if (collaborator.status === 'pending') {
      await supabase.rpc('accept_collaborator_invitation', { p_token: token });
    }
  }

  const proposal = collaborator.proposals as any;

  const proposalId = collaborator.proposal_id as string;
  const collaboratorRole =
    collaborator.role === 'editor' || collaborator.role === 'admin' || collaborator.role === 'viewer'
      ? collaborator.role
      : 'viewer';

  return (
    <SharedProposalView
      proposal={proposal}
      proposalId={proposalId}
      collaboratorRole={collaboratorRole}
      collaboratorEmail={collaborator.email}
      invitationToken={token}
      isAuthenticated={isAuthenticated}
    />
  );
}
