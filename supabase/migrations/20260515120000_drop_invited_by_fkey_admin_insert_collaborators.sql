-- INSERT into proposal_collaborators fails when invited_by REFERENCES auth.users:
-- PostgreSQL validates the FK by reading auth.users under RLS → permission denied (often 42501, mentions "users").
-- invited_by is still set by the app to auth.uid(); we only remove the FK (same as FIX_COLLABORATORS_NOW.sql).
--
-- Also add INSERT for proposal admins who are not proposals.user_id (policy previously owner-only).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.proposal_collaborators'::regclass
      AND c.contype = 'f'
      AND EXISTS (
        SELECT 1
        FROM unnest(c.conkey::smallint[]) AS ck(attnum)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
        WHERE a.attname = 'invited_by'
      )
  ) LOOP
    EXECUTE format('ALTER TABLE public.proposal_collaborators DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Ensure RBAC helpers exist (idem prior migrations)
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

DROP POLICY IF EXISTS "Proposal admins can insert collaborator invites" ON public.proposal_collaborators;
CREATE POLICY "Proposal admins can insert collaborator invites"
  ON public.proposal_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND invited_by = auth.uid()
    AND public.pm_is_admin(proposal_id)
  );
