-- Create collaborators table for proposal sharing
CREATE TABLE IF NOT EXISTS proposal_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID NOT NULL, -- Store user ID without FK constraint to avoid RLS issues with auth.users
  invitation_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(proposal_id, email)
);

-- Enable Row Level Security
ALTER TABLE proposal_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view collaborators for proposals they own or are invited to
CREATE POLICY "Users can view collaborators for their proposals"
  ON proposal_collaborators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
    -- Note: We can't check email match in RLS directly, so we'll handle this in application code
    -- Collaborators can view their own invitations via the token-based route
  );

-- Policy: Proposal owners can add collaborators
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

-- Policy: Proposal owners can update collaborators
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

-- Policy: Proposal owners can delete collaborators
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

-- Create indexes
CREATE INDEX IF NOT EXISTS proposal_collaborators_proposal_id_idx ON proposal_collaborators(proposal_id);
CREATE INDEX IF NOT EXISTS proposal_collaborators_email_idx ON proposal_collaborators(email);
CREATE INDEX IF NOT EXISTS proposal_collaborators_token_idx ON proposal_collaborators(invitation_token);
