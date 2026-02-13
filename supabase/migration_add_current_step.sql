-- Migration: Add current_step column to proposals table
-- Run this if you already have a proposals table without current_step

-- Step 1: Add the column
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'upload';

-- Step 2: Update existing proposals to have a default step based on their status
UPDATE proposals 
SET current_step = CASE 
  WHEN generated_output IS NOT NULL AND status = 'generated' THEN 'proposal'
  WHEN baa_input IS NOT NULL AND generated_output IS NULL THEN 'context'
  ELSE 'upload'
END
WHERE current_step IS NULL;
