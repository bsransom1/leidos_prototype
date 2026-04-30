-- Fix: allow anonymous (unauthenticated) users to look up a proposal
-- by invitation token. This is required for the shared proposal link to
-- work for external recipients who are not signed in.
--
-- Run this in Supabase → SQL Editor → New query.

-- 1. Allow anon to SELECT from proposal_collaborators
--    (the invitation token URL is the only way to reach these rows,
--    and it is a UUID — effectively a secret key)
DROP POLICY IF EXISTS "Anon invitation token lookup" ON proposal_collaborators;
CREATE POLICY "Anon invitation token lookup"
  ON proposal_collaborators
  FOR SELECT
  TO anon
  USING (status IN ('pending', 'accepted'));

-- 2. Allow anon to SELECT the linked proposal (via the collaborator join)
DROP POLICY IF EXISTS "Anon can read shared proposals" ON proposals;
CREATE POLICY "Anon can read shared proposals"
  ON proposals
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM proposal_collaborators
      WHERE proposal_collaborators.proposal_id = proposals.id
        AND proposal_collaborators.status IN ('pending', 'accepted')
    )
  );

-- Verify
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('proposal_collaborators', 'proposals')
  AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;
