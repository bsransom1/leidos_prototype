-- Optional: run AFTER marking a proposal awarded (so pm_phases is empty) OR truncate PM tables first.
-- The app seeds the same structure via POST /api/proposals/[id]/award — this file is for DBA-only replay.

-- Replace with your proposal UUID:
-- \set proposal_id 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

-- Example: copy phases/milestones from migration test — prefer using the in-app "Mark as Awarded" flow.
