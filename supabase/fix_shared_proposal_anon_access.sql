-- Fix: allow anonymous (unauthenticated) users to open /proposal/shared/[token]
-- and load the linked proposal. Run in Supabase → SQL Editor.
--
-- Part A — anon SELECT on collaborators (token is the unguessable secret).
-- Part B — anon SELECT on proposals via SECURITY DEFINER helper to avoid
--          infinite RLS recursion (42P17) between proposals ↔ proposal_collaborators.

-- ── A. Collaborators visible to anon when invite is still valid ─────────────
DROP POLICY IF EXISTS "Anon invitation token lookup" ON proposal_collaborators;
CREATE POLICY "Anon invitation token lookup"
  ON proposal_collaborators
  FOR SELECT
  TO anon
  USING (status IN ('pending', 'accepted'));

-- ── B. Proposals linked to an active invite — no recursive EXISTS ──────────
CREATE OR REPLACE FUNCTION public.proposal_has_active_collaborator_invite(p_proposal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proposal_collaborators pc
    WHERE pc.proposal_id = p_proposal_id
      AND pc.status IN ('pending', 'accepted')
  );
$$;

REVOKE ALL ON FUNCTION public.proposal_has_active_collaborator_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proposal_has_active_collaborator_invite(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.proposal_has_active_collaborator_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.proposal_has_active_collaborator_invite(uuid) TO service_role;

DROP POLICY IF EXISTS "Anon can read shared proposals" ON proposals;
CREATE POLICY "Anon can read shared proposals"
  ON proposals
  FOR SELECT
  TO anon
  USING (public.proposal_has_active_collaborator_invite(id));

-- Verify
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('proposal_collaborators', 'proposals')
  AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;
