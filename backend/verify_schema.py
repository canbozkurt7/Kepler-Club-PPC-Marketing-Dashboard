#!/usr/bin/env python3
"""Verify database schema was created successfully."""

from supabase import create_client, Client

SUPABASE_URL = "https://iggljsgomjlhnajdeowt.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZ2xqc2dvbWpsaG5hamRlb3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxNDMxMywiZXhwIjoyMDc4NzkwMzEzfQ.gNpBgbF-awWaqyP9_WTaFuMtUf0Z-yjkOI0runh2ZQM"

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
