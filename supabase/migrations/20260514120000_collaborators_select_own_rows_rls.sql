-- Invitees could not see their own proposal_collaborators row: SELECT was owner-only.
-- That broke app-side role resolution (getPmRole) and prevented the EXISTS clause in
-- "Collaborators can view shared proposals" from matching for authenticated collaborators.

DROP POLICY IF EXISTS "Collaborators can view own collaborator rows" ON public.proposal_collaborators;

CREATE POLICY "Collaborators can view own collaborator rows"
  ON public.proposal_collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email::text) = lower(proposal_collaborators.email::text)
    )
  );
