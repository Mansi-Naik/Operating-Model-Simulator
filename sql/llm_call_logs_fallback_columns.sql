-- Run in Supabase SQL editor to support Gemini model fallback logging.
ALTER TABLE llm_call_logs
  ADD COLUMN IF NOT EXISTS fallback_attempts JSONB DEFAULT NULL;

ALTER TABLE llm_call_logs
  ADD COLUMN IF NOT EXISTS fallback_occurred BOOLEAN DEFAULT FALSE;
