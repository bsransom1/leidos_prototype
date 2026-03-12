-- QUICK FIX: Run this ENTIRE script in Supabase SQL Editor
-- Copy and paste ALL of this into Supabase SQL Editor and run it

-- Step 1: Find and drop ALL foreign key constraints on invited_by
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'proposal_collaborators'::regclass
        AND conname LIKE '%invited_by%'
    ) LOOP
        EXECUTE 'ALTER TABLE proposal_collaborators DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view collaborators for their proposals" ON proposal_collaborators;
DROP POLICY IF EXISTS "Proposal owners can add collaborators" ON proposal_collaborators;
DROP POLICY IF EXISTS "Proposal owners can update collaborators" ON proposal_collaborators;
DROP POLICY IF EXISTS "Proposal owners can delete collaborators" ON proposal_collaborators;

-- Step 3: Recreate SELECT policy (simple - just check proposal ownership)
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

-- Step 4: Recreate INSERT policy (verify ownership + invited_by matches)
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

-- Step 5: Recreate UPDATE policy
CREATE POLICY "Proposal owners can update collaborators"
  ON proposal_collaborators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals 
      WHERE proposals.id = proposal_collaborators.proposal_id 
      AND proposals.user_id = auth.uid()
    )
  );

-- Step 6: Recreate DELETE policy
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

-- Step 7: Verify - should show 0 constraints on invited_by
SELECT 
  'FK Constraints on invited_by' AS check_type,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '❌ STILL EXISTS' END AS status
FROM pg_constraint
WHERE conrelid = 'proposal_collaborators'::regclass
AND conname LIKE '%invited_by%';

-- Step 8: Verify policies exist
SELECT 
  'Policies count' AS check_type,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) >= 4 THEN '✅ OK' ELSE '❌ MISSING' END AS status
FROM pg_policies
WHERE tablename = 'proposal_collaborators';

-- DONE! Now try inviting a collaborator.
