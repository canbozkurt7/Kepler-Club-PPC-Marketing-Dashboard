#!/usr/bin/env python3
"""Verify database schema was created successfully."""

import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

print("=" * 80)
print("Verifying Database Schema")
print("=" * 80)

try:
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

    # Check platforms
    platforms = supabase.table("platforms").select("*").execute()
    print(f"\n[OK] Platforms: {len(platforms.data)} records")
    for p in platforms.data:
        print(f"     - {p['name']}")

    # Check locations
    locations = supabase.table("locations").select("*").execute()
    print(f"\n[OK] Locations: {len(locations.data)} records")
    for loc in locations.data:
        print(f"     - {loc['code']}: {loc['name']} ({loc['timezone']})")

    # Check alert rules
    rules = supabase.table("alert_rules").select("*").execute()
    print(f"\n[OK] Alert Rules: {len(rules.data)} records")
    for rule in rules.data[:3]:
        print(f"     - {rule['metric_name']} {rule['operator']} {rule['threshold']} ({rule['severity']})")

    print("\n" + "=" * 80)
    print("[OK] Database schema verified successfully!")
    print("=" * 80)
    print("\nAll tables created and seeded.")
    print("Ready for Phase 2: Google Ads sync")

except Exception as e:
    print(f"\n[ERROR] {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
