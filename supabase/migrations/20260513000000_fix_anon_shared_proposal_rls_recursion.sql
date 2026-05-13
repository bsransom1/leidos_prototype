-- Fix infinite RLS recursion (42P17) for anonymous shared proposal links.
--
-- Problem: policy "Anon can read shared proposals" on proposals used
--   EXISTS (SELECT 1 FROM proposal_collaborators ...)
-- Evaluating proposal_collaborators under RLS runs other policies that
-- reference proposals again → infinite recursion.
--
-- Solution: SECURITY DEFINER helper reads proposal_collaborators without
-- RLS re-entry for the existence check.

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
