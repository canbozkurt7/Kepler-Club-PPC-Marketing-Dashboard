-- Schema patch v1: align Supabase tables with the SQLAlchemy models.
-- The original schema.sql was missing columns the backend writes to —
-- without these, the first sync INSERT would fail.
-- Run this once in Supabase SQL Editor.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sync_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE alert_history ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id);
ALTER TABLE alert_history ADD COLUMN IF NOT EXISTS email_sent VARCHAR(255);
ALTER TABLE alert_history ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;

ALTER TABLE clarity_friction_metrics ADD COLUMN IF NOT EXISTS sessions INTEGER DEFAULT 0;
ALTER TABLE clarity_friction_metrics ADD COLUMN IF NOT EXISTS users INTEGER DEFAULT 0;
ALTER TABLE clarity_friction_metrics ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify: should list the new columns
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'campaigns' AND column_name = 'updated_at') OR
    (table_name = 'ad_groups' AND column_name = 'updated_at') OR
    (table_name = 'daily_metrics' AND column_name = 'synced_at') OR
    (table_name = 'sync_logs' AND column_name IN ('started_at', 'completed_at')) OR
    (table_name = 'alert_rules' AND column_name = 'updated_at') OR
    (table_name = 'alert_history' AND column_name IN ('campaign_id', 'email_sent', 'email_sent_at')) OR
    (table_name = 'clarity_friction_metrics' AND column_name IN ('sessions', 'users', 'synced_at'))
  )
ORDER BY table_name, column_name;
