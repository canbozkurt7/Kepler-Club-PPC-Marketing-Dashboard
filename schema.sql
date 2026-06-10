-- PPC Dashboard Schema for Supabase
-- Run this in Supabase SQL Editor

-- Platforms
CREATE TABLE IF NOT EXISTS platforms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations (airport codes)
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC+3',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES platforms(id),
  platform_campaign_id VARCHAR(255) NOT NULL,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform_id, platform_campaign_id)
);

-- Ad Groups
CREATE TABLE IF NOT EXISTS ad_groups (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  platform_ad_group_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, platform_ad_group_id)
);

-- Daily Metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  ad_group_id INTEGER NOT NULL REFERENCES ad_groups(id),
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  platform_id INTEGER NOT NULL REFERENCES platforms(id),
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend_eur DECIMAL(12, 2) DEFAULT 0.00,
  conversions INTEGER DEFAULT 0,
  conversion_value_eur DECIMAL(12, 2) DEFAULT 0.00,
  ctr DECIMAL(5, 3),
  cpc_eur DECIMAL(10, 4),
  cpa_eur DECIMAL(10, 2),
  roas DECIMAL(8, 2),
  sync_source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ad_group_id, metric_date, platform_id)
);

-- Hourly Metrics Snapshot
CREATE TABLE IF NOT EXISTS hourly_metrics_snapshot (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  platform_id INTEGER NOT NULL REFERENCES platforms(id),
  metric_hour TIMESTAMP NOT NULL,
  impressions_today INTEGER DEFAULT 0,
  clicks_today INTEGER DEFAULT 0,
  spend_today_eur DECIMAL(12, 2) DEFAULT 0.00,
  conversions_today INTEGER DEFAULT 0,
  conversion_value_today_eur DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, metric_hour)
);

-- Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id),
  alert_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  threshold DECIMAL(12, 2) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  notify_channels VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert History
CREATE TABLE IF NOT EXISTS alert_history (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER NOT NULL REFERENCES alert_rules(id),
  location_id INTEGER REFERENCES locations(id),
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metric_value DECIMAL(12, 4),
  alert_status VARCHAR(20) DEFAULT 'triggered',
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP
);

-- Clarity Friction Metrics
CREATE TABLE IF NOT EXISTS clarity_friction_metrics (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id),
  friction_date DATE NOT NULL,
  page_url VARCHAR(500),
  dead_clicks INTEGER DEFAULT 0,
  rage_clicks INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  avg_load_time_ms INTEGER,
  performance_score DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER REFERENCES platforms(id),
  sync_type VARCHAR(50),
  sync_status VARCHAR(20),
  records_processed INTEGER,
  sync_duration_sec INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data: Platforms
INSERT INTO platforms (name) VALUES ('google'), ('meta'), ('yandex')
ON CONFLICT DO NOTHING;

-- Seed data: Locations
INSERT INTO locations (code, name, timezone) VALUES
  ('SAW', 'Istanbul Sabiha Gokcen', 'UTC+3'),
  ('KLIA', 'Kuala Lumpur International', 'UTC+8'),
  ('RIX', 'Riga International', 'UTC+2')
ON CONFLICT DO NOTHING;

-- Seed data: Alert Rules
INSERT INTO alert_rules (alert_type, metric_name, operator, threshold, severity, notify_channels) VALUES
  ('roas_threshold', 'roas', '<', 1.5, 'CRITICAL', 'email'),
  ('roas_threshold', 'roas', '<', 2.0, 'HIGH', 'dashboard'),
  ('cpa_threshold', 'cpa_eur', '>', 200, 'HIGH', 'email'),
  ('cpa_change', 'cpa_eur', 'change>25%', 0, 'MEDIUM', 'dashboard'),
  ('zero_conversions', 'conversions', '==', 0, 'CRITICAL', 'email'),
  ('spend_anomaly', 'spend_eur', '>150%_7day_avg', 0, 'HIGH', 'email'),
  ('ctr_threshold', 'ctr', '<', 2.0, 'LOW', 'dashboard')
ON CONFLICT DO NOTHING;
