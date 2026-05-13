-- Allow proposal admins (owner OR collaborator role admin) to UPDATE
-- proposal_collaborators rows (e.g. change viewer → editor) without being proposals.user_id.
--
-- Defines pm_is_proposal_owner / pm_collaborator_role / pm_is_admin if missing
-- (same logic as migration_pm_post_award.sql). Safe: CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- RBAC helpers (proposal_id = proposal UUID in routes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pm_is_proposal_owner(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals WHERE id = pid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.pm_collaborator_role(pid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pc.role
  FROM public.proposal_collaborators pc
  JOIN auth.users u ON u.id = auth.uid()
  WHERE pc.proposal_id = pid
    AND lower(pc.email) = lower(u.email::text)
    AND pc.status = 'accepted'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pm_is_admin(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pm_is_proposal_owner(pid)
    OR public.pm_collaborator_role(pid) = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- Policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Proposal admins can update collaborators" ON public.proposal_collaborators;
CREATE POLICY "Proposal admins can update collaborators"
  ON public.proposal_collaborators
  FOR UPDATE
  TO authenticated
  USING (public.pm_is_admin(proposal_id))
  WITH CHECK (public.pm_is_admin(proposal_id));

DROP POLICY IF EXISTS "Proposal admins can delete collaborator invites" ON public.proposal_collaborators;
CREATE POLICY "Proposal admins can delete collaborator invites"
  ON public.proposal_collaborators
  FOR DELETE
  TO authenticated
  USING (public.pm_is_admin(proposal_id));
