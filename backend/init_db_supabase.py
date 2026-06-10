#!/usr/bin/env python3
"""Initialize database using Supabase SDK instead of psycopg2 connection strings."""

import os
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://iggljsgomjlhnajdeowt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZ2xqc2dvbWpsaG5hamRlb3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTQzMTMsImV4cCI6MjA3ODc5MDMxM30.BfD6Zzorx1vU4KZHTSASC9qs0UKBiWYVNYa_KL7WTgk"

print("=" * 80)
print("PPC Marketing Dashboard - Database Initialization (Supabase SDK)")
print("=" * 80)

try:
    # Initialize Supabase client
    print(f"\n[*] Connecting to Supabase at {SUPABASE_URL}...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[OK] Connected to Supabase")

    # Test connection by querying the database
    print("[*] Testing database connection...")
    result = supabase.table("platforms").select("*").limit(1).execute()
    print("[OK] Database accessible")

    # Check if tables already exist
    print("\n[*] Checking existing tables...")

    # Try to get platforms
    try:
        platforms = supabase.table("platforms").select("*").execute()
        print(f"[OK] platforms table exists with {len(platforms.data)} records")
    except Exception as e:
        print(f"[*] platforms table doesn't exist yet (expected on first run)")

    print("\n[OK] Supabase connection verified!")
    print("\nNow I can access your database directly via MCP!")

except Exception as e:
    print(f"\n[ERROR] {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
