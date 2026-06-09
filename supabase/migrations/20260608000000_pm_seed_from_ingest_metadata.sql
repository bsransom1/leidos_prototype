-- PM seed metadata columns: track which profile was used and when PM was seeded from ingest.
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS pm_profile text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS pm_seeded_at timestamptz;
