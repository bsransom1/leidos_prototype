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
      <div className="min-h-screen flex items-center justify-center bg-ds-page px-4">
        <div className="w-full max-w-md border border-ds-border bg-ds-surface shadow-ds-md">
          <div className="h-[3px] bg-gradient-to-r from-ds-primary to-ds-accent" />
          <div className="px-8 py-7">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted mb-3">
              Access Error
            </p>
            <h1 className="text-lg font-bold text-ds-text mb-3">Invalid or expired invitation</h1>
            <p className="text-sm leading-relaxed text-ds-text-muted">
              This invitation link is invalid, has expired, or has already been used.
              Contact the proposal owner to request a new link.
            </p>
          </div>
          <div className="border-t border-ds-border bg-ds-shell/40 px-8 py-3">
            <p className="font-mono text-[10px] text-ds-text-muted">LEIDOS GENAI · PROPOSAL INTELLIGENCE</p>
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
    // Update status to accepted if still pending
    if (collaborator.status === 'pending') {
      await supabase
        .from('proposal_collaborators')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', collaborator.id);
    }
  }

  const proposal = collaborator.proposals as any;

  return (
    <SharedProposalView 
      proposal={proposal}
      collaboratorEmail={collaborator.email}
      invitationToken={token}
      isAuthenticated={isAuthenticated}
    />
  );
}
