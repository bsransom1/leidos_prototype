-- Allow accepted editors (and owners via pm_can_edit) to UPDATE proposal content.
-- Allow proposal admins (owner or collaborator role admin) to DELETE proposals.
--
-- Defines pm_* helpers if missing (same logic as migration_pm_post_award.sql).

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

CREATE OR REPLACE FUNCTION public.pm_can_view(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pm_is_proposal_owner(pid) OR public.pm_collaborator_role(pid) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.pm_can_edit(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pm_is_proposal_owner(pid)
    OR public.pm_collaborator_role(pid) IN ('editor', 'admin');
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
-- Policies on proposals
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Collaborators editors can update proposals" ON public.proposals;
CREATE POLICY "Collaborators editors can update proposals"
  ON public.proposals
  FOR UPDATE
  TO authenticated
  USING (public.pm_can_edit(id))
  WITH CHECK (public.pm_can_edit(id));

DROP POLICY IF EXISTS "Proposal admins can delete proposals" ON public.proposals;
CREATE POLICY "Proposal admins can delete proposals"
  ON public.proposals
  FOR DELETE
  TO authenticated
  USING (public.pm_is_admin(id));
