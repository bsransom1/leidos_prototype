CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  baa_input TEXT,
  generated_output TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_step TEXT DEFAULT 'upload',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proposals"
  ON proposals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proposals"
  ON proposals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proposals"
  ON proposals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proposals"
  ON proposals
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS proposals_user_id_idx ON proposals(user_id);
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,
ADD COLUMN IF NOT EXISTS pdf_file_data BYTEA,
ADD COLUMN IF NOT EXISTS organization_context_json TEXT;

CREATE INDEX IF NOT EXISTS proposals_pdf_file_name_idx ON proposals(pdf_file_name);

CREATE TABLE IF NOT EXISTS proposal_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(proposal_id, email)
);

ALTER TABLE proposal_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaborators for their proposals"
  ON proposal_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Proposal owners can add collaborators"
  ON proposal_collaborators
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Proposal owners can update collaborators"
  ON proposal_collaborators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Proposal owners can delete collaborators"
  ON proposal_collaborators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS proposal_collaborators_proposal_id_idx ON proposal_collaborators(proposal_id);
CREATE INDEX IF NOT EXISTS proposal_collaborators_email_idx ON proposal_collaborators(email);
CREATE INDEX IF NOT EXISTS proposal_collaborators_token_idx ON proposal_collaborators(invitation_token);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS period_of_performance_start DATE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS period_of_performance_end DATE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS cmmc_level TEXT DEFAULT 'CMMC Level 2';

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_contract_value NUMERIC(14, 2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS cost_share_amount NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_invoiced NUMERIC(14, 2) DEFAULT 0;

CREATE OR REPLACE FUNCTION pm_is_proposal_owner(pid uuid)
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

CREATE OR REPLACE FUNCTION pm_collaborator_role(pid uuid)
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

CREATE OR REPLACE FUNCTION pm_can_view(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm_is_proposal_owner(pid) OR pm_collaborator_role(pid) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION pm_can_edit(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm_is_proposal_owner(pid)
    OR pm_collaborator_role(pid) IN ('editor', 'admin');
$$;

CREATE OR REPLACE FUNCTION pm_is_admin(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm_is_proposal_owner(pid)
    OR pm_collaborator_role(pid) = 'admin';
$$;

CREATE TABLE IF NOT EXISTS pm_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  org_name TEXT,
  role TEXT,
  clearance_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pm_team_members_proposal_idx ON pm_team_members(proposal_id);

ALTER TABLE pm_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_team_members_select" ON pm_team_members
  FOR SELECT USING (pm_can_view(proposal_id));

CREATE POLICY "pm_team_members_insert" ON pm_team_members
  FOR INSERT WITH CHECK (pm_is_admin(proposal_id));

CREATE POLICY "pm_team_members_update" ON pm_team_members
  FOR UPDATE USING (pm_is_admin(proposal_id)) WITH CHECK (pm_is_admin(proposal_id));

CREATE POLICY "pm_team_members_delete" ON pm_team_members
  FOR DELETE USING (pm_is_admin(proposal_id));

CREATE TABLE IF NOT EXISTS pm_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  obligated_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  spent_to_date NUMERIC(14, 2) NOT NULL DEFAULT 0,
  invoiced_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  burn_rate_plan NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proposal_id, phase_number)
);

CREATE INDEX IF NOT EXISTS pm_phases_proposal_idx ON pm_phases(proposal_id);

ALTER TABLE pm_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_phases_select" ON pm_phases
  FOR SELECT USING (pm_can_view(proposal_id));

CREATE POLICY "pm_phases_insert" ON pm_phases
  FOR INSERT WITH CHECK (pm_is_admin(proposal_id));

CREATE POLICY "pm_phases_update" ON pm_phases
  FOR UPDATE USING (pm_is_admin(proposal_id)) WITH CHECK (pm_is_admin(proposal_id));

CREATE POLICY "pm_phases_delete" ON pm_phases
  FOR DELETE USING (pm_is_admin(proposal_id));

CREATE TABLE IF NOT EXISTS pm_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES pm_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completion_criteria TEXT,
  due_date DATE NOT NULL,
  payment_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'in_progress', 'submitted', 'accepted', 'at_risk', 'missed')),
  owner_id UUID REFERENCES pm_team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pm_milestones_phase_idx ON pm_milestones(phase_id);

ALTER TABLE pm_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_milestones_select" ON pm_milestones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pm_phases ph
    WHERE ph.id = pm_milestones.phase_id AND pm_can_view(ph.proposal_id)
  )
);

CREATE POLICY "pm_milestones_insert" ON pm_milestones FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm_phases ph
    WHERE ph.id = phase_id AND pm_can_edit(ph.proposal_id)
  )
);

CREATE POLICY "pm_milestones_update" ON pm_milestones FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pm_phases ph
    WHERE ph.id = pm_milestones.phase_id AND pm_can_edit(ph.proposal_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm_phases ph
    WHERE ph.id = pm_milestones.phase_id AND pm_can_edit(ph.proposal_id)
  )
);

CREATE POLICY "pm_milestones_delete" ON pm_milestones FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pm_phases ph
    WHERE ph.id = pm_milestones.phase_id AND pm_is_admin(ph.proposal_id)
  )
);

CREATE TABLE IF NOT EXISTS pm_milestone_assignments (
  milestone_id UUID NOT NULL REFERENCES pm_milestones(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES pm_team_members(id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_id, team_member_id)
);

ALTER TABLE pm_milestone_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_ma_select" ON pm_milestone_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_view(ph.proposal_id)
  )
);

CREATE POLICY "pm_ma_write" ON pm_milestone_assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_edit(ph.proposal_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_edit(ph.proposal_id)
  )
);

CREATE TABLE IF NOT EXISTS pm_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES pm_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'technical_report', 'software', 'demo', 'presentation', 'data_package'
  )),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'submitted', 'accepted', 'overdue'
  )),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pm_deliverables_milestone_idx ON pm_deliverables(milestone_id);

ALTER TABLE pm_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_deliverables_select" ON pm_deliverables FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_view(ph.proposal_id)
  )
);

CREATE POLICY "pm_deliverables_insert" ON pm_deliverables FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_edit(ph.proposal_id)
  )
);

CREATE POLICY "pm_deliverables_update" ON pm_deliverables FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_edit(ph.proposal_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_edit(ph.proposal_id)
  )
);

CREATE POLICY "pm_deliverables_delete" ON pm_deliverables FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_is_admin(ph.proposal_id)
  )
);

CREATE TABLE IF NOT EXISTS pm_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'schedule', 'cost', 'security')),
  probability INT NOT NULL CHECK (probability BETWEEN 1 AND 10),
  impact INT NOT NULL CHECK (impact BETWEEN 1 AND 10),
  mitigation TEXT,
  owner_id UUID REFERENCES pm_team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pm_risks_proposal_idx ON pm_risks(proposal_id);

ALTER TABLE pm_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_risks_select" ON pm_risks
  FOR SELECT USING (pm_can_view(proposal_id));

CREATE POLICY "pm_risks_insert" ON pm_risks
  FOR INSERT WITH CHECK (pm_is_admin(proposal_id));

CREATE POLICY "pm_risks_update" ON pm_risks
  FOR UPDATE USING (pm_is_admin(proposal_id)) WITH CHECK (pm_is_admin(proposal_id));

CREATE POLICY "pm_risks_delete" ON pm_risks
  FOR DELETE USING (pm_is_admin(proposal_id));

CREATE TABLE IF NOT EXISTS pm_milestone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES pm_milestones(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pm_milestone_events_milestone_idx ON pm_milestone_events(milestone_id);

ALTER TABLE pm_milestone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators can view shared proposals" ON proposals;
CREATE POLICY "Collaborators can view shared proposals"
  ON proposals FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proposal_collaborators pc
      JOIN auth.users u ON u.id = auth.uid()
      WHERE pc.proposal_id = proposals.id
        AND lower(pc.email) = lower(u.email)
        AND pc.status = 'accepted'
    )
  );

CREATE POLICY "pm_me_select" ON pm_milestone_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_view(ph.proposal_id)
  )
);

CREATE POLICY "pm_me_insert" ON pm_milestone_events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pm_milestones m
    JOIN pm_phases ph ON ph.id = m.phase_id
    WHERE m.id = milestone_id AND pm_can_edit(ph.proposal_id)
  )
);
