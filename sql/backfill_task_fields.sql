-- Idempotent backfill for tasks with NULL classifier fields.
-- Mirrors client-side inference in src/lib/capabilityLibrary.js (inferMissingFields).
-- Safe to run multiple times: each UPDATE touches only rows where target columns are still NULL.

-- Consequence — regulatory-linked first
UPDATE tasks
SET consequence_of_error = 'critical'
WHERE consequence_of_error IS NULL
  AND regulatory_constraint IS TRUE;

-- Consequence — task_name keywords (excluding rows already populated above)
UPDATE tasks
SET consequence_of_error = CASE
    WHEN lower(coalesce(task_name, ''))
      ~ '(csam|terror|fraud|compliance|kyc|aml)' THEN 'critical'
    WHEN lower(coalesce(task_name, '')) ~ '(precedent|policy|escalat|severe)' THEN 'high'
    WHEN lower(coalesce(task_name, '')) ~ '(spam|bot|basic|routine)' THEN 'low'
    ELSE 'medium'
  END
WHERE consequence_of_error IS NULL;

UPDATE tasks
SET input_data_type = CASE
    WHEN lower(coalesce(task_name, '')) ~ '(voice|\bcall\b|phone)' THEN 'unstructured_voice'
    WHEN lower(coalesce(task_name, '')) ~ '(image|photo|visual)' THEN 'unstructured_image'
    WHEN lower(coalesce(task_name, '')) ~ 'video' THEN 'unstructured_video'
    WHEN lower(coalesce(task_name, '')) ~ '(report|compile|dashboard|\bdata\b)' THEN 'structured'
    WHEN lower(coalesce(task_name, '')) ~ '(coach|\bcalibrat)' THEN 'unstructured_text'
    ELSE 'mixed'
  END
WHERE input_data_type IS NULL;

UPDATE tasks
SET task_type = CASE
    WHEN lower(coalesce(task_name, '')) ~ '(compile|report|dashboard|summary)' THEN 'reporting'
    WHEN lower(coalesce(task_name, ''))
      ~ '(coach|audit|investigat|\bjudge\b|assess|evaluate)' THEN 'judgment'
    WHEN lower(coalesce(task_name, '')) ~ '(escalate|exception|severe|precedent)' THEN 'edge-case'
    WHEN lower(coalesce(task_name, '')) ~ '(schedule|\bapprove\b|admin)' THEN 'admin'
    ELSE 'rule-based'
  END
WHERE task_type IS NULL;

UPDATE tasks
SET data_logged = CASE
    WHEN lower(coalesce(task_name, '')) ~ '(coach|\bcalibrat|investigat)' THEN FALSE
    ELSE TRUE
  END
WHERE data_logged IS NULL;
