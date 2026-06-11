-- Schema patch v2: widen daily_metrics.ctr
-- DECIMAL(5,3) maxes out at 99.999, but CTR can legitimately be 100%
-- (e.g. 1 impression, 1 click), which crashed the 30-day backfill with
-- "numeric field overflow". Run once in Supabase SQL Editor.

ALTER TABLE daily_metrics ALTER COLUMN ctr TYPE DECIMAL(6,3);
