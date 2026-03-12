-- Update proposals table to store PDF and organization context separately
-- Run this migration to add new columns for better data organization

-- Add columns for storing PDF file data and organization context JSON
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,
ADD COLUMN IF NOT EXISTS pdf_file_data BYTEA,
ADD COLUMN IF NOT EXISTS organization_context_json TEXT;

-- Add index for faster queries on file names
CREATE INDEX IF NOT EXISTS proposals_pdf_file_name_idx ON proposals(pdf_file_name);

-- Update existing proposals to migrate data if needed
-- (This is optional - only run if you have existing data to migrate)
-- UPDATE proposals 
-- SET organization_context_json = baa_input 
-- WHERE organization_context_json IS NULL AND baa_input IS NOT NULL;
