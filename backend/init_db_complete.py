#!/usr/bin/env python3
"""Initialize PPC Dashboard database schema in Supabase."""

from supabase import create_client, Client

SUPABASE_URL = "https://iggljsgomjlhnajdeowt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZ2xqc2dvbWpsaG5hamRlb3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTQzMTMsImV4cCI6MjA3ODc5MDMxM30.BfD6Zzorx1vU4KZHTSASC9qs0UKBiWYVNYa_KL7WTgk"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZ2xqc2dvbWpsaG5hamRlb3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxNDMxMywiZXhwIjoyMDc4NzkwMzEzfQ.gNpBgbF-awWaqyP9_WTaFuMtUf0Z-yjkOI0runh2ZQM"

# SQL schema for all tables
SCHEMA = """
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
  ctr DECIMAL(5, 3) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (clicks::DECIMAL / impressions) * 100 ELSE 0 END
  ) STORED,
  cpc_eur DECIMAL(10, 4) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN spend_eur / clicks ELSE 0 END
  ) STORED,
  cpa_eur DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE WHEN conversions > 0 THEN spend_eur / conversions ELSE 0 END
  ) STORED,
  roas DECIMAL(8, 2) GENERATED ALWAYS AS (
    CASE WHEN spend_eur > 0 THEN conversion_value_eur / spend_eur ELSE 0 END
  ) STORED,
  sync_source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ad_group_id, metric_date, platform_id)
);

-- Hourly Metrics Snapshot (for "today's spend" queries)
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
  operator VARCHAR(10) NOT NULL,
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
"""

print("=" * 80)
print("PPC Dashboard - Creating Database Schema in Supabase")
print("=" * 80)

try:
    # Connect with service role (has permission to create tables)
    print("\n[*] Connecting to Supabase (service role)...")
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    print("[OK] Connected")

    # Execute schema creation
    print("[*] Creating tables...")
    result = supabase.postgrest.rpc("exec", {"sql": SCHEMA}).execute()
    print("[OK] Schema created")

    # Seed locations
    print("\n[*] Seeding locations...")
    locations = [
        {"code": "SAW", "name": "Istanbul Sabiha Gokcen", "timezone": "UTC+3"},
        {"code": "KLIA", "name": "Kuala Lumpur International", "timezone": "UTC+8"},
        {"code": "RIX", "name": "Riga International", "timezone": "UTC+2"},
    ]
    supabase.table("locations").insert(locations).execute()
    print(f"[OK] Inserted {len(locations)} locations")

    # Seed platforms
    print("[*] Seeding platforms...")
    platforms = [
        {"name": "google"},
        {"name": "meta"},
        {"name": "yandex"},
    ]
    supabase.table("platforms").insert(platforms).execute()
    print(f"[OK] Inserted {len(platforms)} platforms")

    # Seed alert rules
    print("[*] Seeding alert rules...")
    rules = [
        {"alert_type": "roas_threshold", "metric_name": "roas", "operator": "<", "threshold": 1.5, "severity": "CRITICAL", "notify_channels": "email"},
        {"alert_type": "roas_threshold", "metric_name": "roas", "operator": "<", "threshold": 2.0, "severity": "HIGH", "notify_channels": "dashboard"},
        {"alert_type": "cpa_threshold", "metric_name": "cpa_eur", "operator": ">", "threshold": 200, "severity": "HIGH", "notify_channels": "email"},
        {"alert_type": "cpa_change", "metric_name": "cpa_eur", "operator": "change>25%", "threshold": 0, "severity": "MEDIUM", "notify_channels": "dashboard"},
        {"alert_type": "zero_conversions", "metric_name": "conversions", "operator": "==", "threshold": 0, "severity": "CRITICAL", "notify_channels": "email"},
        {"alert_type": "spend_anomaly", "metric_name": "spend_eur", "operator": ">150%_7day_avg", "threshold": 0, "severity": "HIGH", "notify_channels": "email"},
        {"alert_type": "ctr_threshold", "metric_name": "ctr", "operator": "<", "threshold": 2.0, "severity": "LOW", "notify_channels": "dashboard"},
    ]
    supabase.table("alert_rules").insert(rules).execute()
    print(f"[OK] Inserted {len(rules)} alert rules")

    print("\n" + "=" * 80)
    print("[OK] Database initialization complete!")
    print("=" * 80)
    print("\nTables created:")
    print("  - platforms, locations, campaigns, ad_groups")
    print("  - daily_metrics, hourly_metrics_snapshot")
    print("  - alert_rules, alert_history")
    print("  - clarity_friction_metrics, sync_logs")
    print("\nData seeded:")
    print("  - 3 locations (SAW, KLIA, RIX)")
    print("  - 3 platforms (google, meta, yandex)")
    print("  - 7 alert rules (ROAS, CPA, conversions, anomalies)")

except Exception as e:
    print(f"\n[ERROR] {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
