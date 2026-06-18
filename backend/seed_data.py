#!/usr/bin/env python3
"""Seed initial data into database."""

import os

from dotenv import load_dotenv
from supabase import create_client, Client

# Load the same .env the rest of the backend uses (see app/config.py).
load_dotenv()

try:
    SUPABASE_URL = os.environ["SUPABASE_URL"]
    SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
except KeyError as missing:
    print(f"[ERROR] Missing required environment variable: {missing}")
    print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env "
          "(see .env.example).")
    exit(1)

print("=" * 80)
print("Seeding Database")
print("=" * 80)

try:
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

    # Seed platforms
    print("\n[*] Inserting platforms...")
    platforms = [
        {"name": "google"},
        {"name": "meta"},
        {"name": "yandex"},
        {"name": "microsoft"},
    ]
    supabase.table("platforms").insert(platforms).execute()
    print("[OK] 4 platforms inserted")

    # Seed locations
    print("[*] Inserting locations...")
    locations = [
        {"code": "SAW", "name": "Istanbul Sabiha Gokcen", "timezone": "UTC+3"},
        {"code": "KLIA", "name": "Kuala Lumpur International", "timezone": "UTC+8"},
        {"code": "RIX", "name": "Riga International", "timezone": "UTC+2"},
    ]
    supabase.table("locations").insert(locations).execute()
    print("[OK] 3 locations inserted")

    # Seed alert rules
    print("[*] Inserting alert rules...")
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
    print("[OK] 7 alert rules inserted")

    print("\n" + "=" * 80)
    print("[OK] Seeding complete!")
    print("=" * 80)

except Exception as e:
    print(f"\n[ERROR] {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
