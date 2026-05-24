-- F5 Reinvestment Opportunities: cache Gemini recommendations per engagement.
-- Run once in Supabase SQL editor before using Reinvestment Opportunities on F5.

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS reinvestment_opportunities JSONB DEFAULT NULL;
