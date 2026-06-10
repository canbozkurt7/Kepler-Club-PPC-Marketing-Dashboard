#!/usr/bin/env python3
import os
import sys
from urllib.parse import quote

# Password with special chars
password = "i@#eDPQG3pDbD4d"
username = "postgres.iggljsgomjlhnajdeowt"
host = "aws-1-eu-north-1.pooler.supabase.com"
port = 5432
database = "postgres"

# URL-encoded version
password_encoded = quote(password, safe='')
connection_string = f"postgresql://{username}:{password_encoded}@{host}:{port}/{database}?sslmode=require"

print("=" * 80)
print("Testing Supabase Connection")
print("=" * 80)
print(f"Host: {host}")
print(f"Port: {port}")
print(f"Database: {database}")
print(f"Username: {username}")
print(f"Password (plain): {password}")
print(f"Password (encoded): {password_encoded}")
print(f"\nConnection string:\n{connection_string}\n")

try:
    import psycopg2
    print("[*] Attempting connection with psycopg2...")
    conn = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=username,
        password=password,
        sslmode='require'
    )
    print("[✓] SUCCESS! Connected to Supabase")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    print(f"[✓] Server version: {cursor.fetchone()[0]}")
    cursor.close()
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"[✗] FAILED: {type(e).__name__}: {e}")
    sys.exit(1)
