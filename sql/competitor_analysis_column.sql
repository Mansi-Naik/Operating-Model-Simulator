-- F5 Competitor Analysis: cache Gemini-generated scores per engagement.
-- Run once in Supabase SQL editor before using Competitor Analysis on F5.

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS competitor_analysis JSONB DEFAULT NULL;
