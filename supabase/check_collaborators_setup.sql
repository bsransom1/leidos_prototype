-- Diagnostic script to check proposal_collaborators table setup
-- Run this in Supabase SQL Editor to diagnose issues

-- 1. Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'proposal_collaborators'
    ) THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist - run migration_add_collaborators.sql'
  END AS table_status;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'proposal_collaborators'
ORDER BY ordinal_position;

-- 3. Check for foreign key constraints (should be NONE on invited_by)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'proposal_collaborators'::regclass
AND conname LIKE '%invited_by%';

-- 4. Check RLS status
SELECT 
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'proposal_collaborators') 
    THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled'
  END AS rls_status;

-- 5. List all policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'proposal_collaborators'
ORDER BY policyname;

-- 6. Test if current user can see proposals
SELECT 
  COUNT(*) AS proposals_owned,
  'Current user can see ' || COUNT(*) || ' proposals' AS status
FROM proposals
WHERE user_id = auth.uid();
