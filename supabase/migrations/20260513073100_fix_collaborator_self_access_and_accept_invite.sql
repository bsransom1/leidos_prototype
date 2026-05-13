-- Fix collaborator self-access without querying auth.users (avoids permission denied)
-- and provide an RLS-safe invitation acceptance path.

-- 1) Collaborators can SELECT their own collaborator row (email match from JWT)
DROP POLICY IF EXISTS "Collaborators can view own collaborator rows" ON public.proposal_collaborators;
CREATE POLICY "Collaborators can view own collaborator rows"
  ON public.proposal_collaborators
  FOR SELECT
  TO authenticated
  USING (
    lower(email::text) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

-- 2) Accept invitation via SECURITY DEFINER function (no brittle UPDATE policies)
CREATE OR REPLACE FUNCTION public.accept_collaborator_invitation(p_token text)
RETURNS public.proposal_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_row public.proposal_collaborators;
BEGIN
  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.proposal_collaborators pc
    SET status = 'accepted',
        accepted_at = COALESCE(pc.accepted_at, now())
  WHERE pc.invitation_token = p_token
    AND lower(pc.email) = v_email
    AND pc.status IN ('pending', 'accepted')
  RETURNING pc.* INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invitation' USING ERRCODE = '22023';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_collaborator_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_collaborator_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_collaborator_invitation(text) TO service_role;

-- Ensure anon cannot call privileged RPCs directly
REVOKE EXECUTE ON FUNCTION public.accept_collaborator_invitation(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pm_is_proposal_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pm_collaborator_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pm_is_admin(uuid) FROM anon;

