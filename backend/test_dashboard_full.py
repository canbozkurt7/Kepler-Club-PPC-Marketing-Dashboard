#!/usr/bin/env python3
"""Smoke test for /api/v1/dashboard/full against a local SQLite database."""

import json
import os
from datetime import date, timedelta

if os.path.exists("test_dashboard.db"):
    os.remove("test_dashboard.db")
os.environ["DATABASE_URL"] = "sqlite:///./test_dashboard.db"

from app.database import SessionLocal, init_db
from app.models import AdGroup, Campaign, DailyMetrics, Location, Platform

init_db()
db = SessionLocal()

# Seed reference data
platforms = {n: Platform(name=n) for n in ("google", "meta", "yandex")}
locations = {
    "SAW": Location(code="SAW", name="Istanbul Sabiha Gokcen", timezone="UTC+3"),
    "KLIA": Location(code="KLIA", name="Kuala Lumpur International", timezone="UTC+8"),
    "RIX": Location(code="RIX", name="Riga International", timezone="UTC+2"),
}
db.add_all([*platforms.values(), *locations.values()])
db.flush()

camp = Campaign(
    platform_id=platforms["google"].id,
    platform_campaign_id="g-123",
    location_id=locations["SAW"].id,
    name="SAW - Search Global",
    status="ACTIVE",
)
db.add(camp)
db.flush()

ag = AdGroup(
    campaign_id=camp.id,
    platform_ad_group_id="ag-1",
    name="Rooms",
    status="ACTIVE",
)
db.add(ag)
db.flush()

today = date.today()
for i in range(5):
    m = DailyMetrics(
        ad_group_id=ag.id,
        campaign_id=camp.id,
        location_id=locations["SAW"].id,
        platform_id=platforms["google"].id,
        metric_date=today - timedelta(days=i),
        impressions=10000 + i * 500,
        clicks=800 + i * 30,
        conversions=12 + i,
        spend_eur=420.50 + i * 10,
        conversion_value_eur=5100.00 + i * 200,
        sync_source="google",
    )
    m.calculate_kpis()
    db.add(m)
db.commit()

from app.api.v1.dashboard_full import get_dashboard_full

result = get_dashboard_full(date_from=None, date_to=None, db=db)

print("[OK] Endpoint returned payload")
print(f"  blended ROAS: {result['kpis']['blended']['roas']}")
print(f"  blended spend: {result['kpis']['blended']['spend']}")
print(f"  trend points: {len(result['trend'])}")
print(f"  google trend points: {len(result['trendByPlatform']['google'])}")
print(f"  campaigns: {len(result['campaigns'])} -> {result['campaigns'][0]['name']}")
print(f"  locations: {[l['code'] for l in result['locations']]}")
print(f"  source: {result['source']}")

# Validate the shape matches the frontend's DashboardData expectations
expected_top = {"source", "updatedAt", "kpis", "trend", "trendByPlatform",
                "campaigns", "alerts", "locations", "ga4", "clarity"}
missing = expected_top - set(result.keys())
assert not missing, f"Missing top-level keys: {missing}"

expected_kpi = {"spend", "revenue", "conversions", "clicks", "impressions",
                "roas", "cpa", "ctr", "cpc"}
for k in ("blended", "google", "meta", "yandex"):
    assert set(result["kpis"][k].keys()) == expected_kpi, f"KPI keys wrong for {k}"

expected_campaign = {"id", "name", "platform", "location", "status", "spend",
                     "revenue", "conversions", "clicks", "impressions",
                     "roas", "cpa", "ctr"}
assert set(result["campaigns"][0].keys()) == expected_campaign

print("\n[OK] Payload shape matches frontend DashboardData exactly")

# Date-window query: subset of days must reduce the KPIs
mid = (today - timedelta(days=2)).isoformat()
windowed = get_dashboard_full(date_from=mid, date_to=today.isoformat(), db=db)
assert len(windowed["trend"]) == 3, f"Expected 3 trend points, got {len(windowed['trend'])}"
assert windowed["kpis"]["blended"]["spend"] < result["kpis"]["blended"]["spend"]
print(f"[OK] Window query: 3 days -> spend {windowed['kpis']['blended']['spend']}"
      f" < full {result['kpis']['blended']['spend']}")

# Data bounds reported regardless of window
assert windowed["dataBounds"]["min"] == (today - timedelta(days=4)).isoformat()
assert windowed["dataBounds"]["max"] == today.isoformat()
print("[OK] dataBounds reflect full DB span even for a narrow window")

# Empty window over a POPULATED database: zeros, NOT 404 (must never
# flip a live dashboard back to demo data)
empty_window = get_dashboard_full(date_from="2020-01-01", date_to="2020-01-31", db=db)
assert empty_window["kpis"]["blended"]["spend"] == 0
assert empty_window["trend"] == []
assert empty_window["dataBounds"]["min"] is not None
print("[OK] Empty window over populated DB returns honest zeros (no 404)")

# Reversed dates are swapped, not an error
swapped = get_dashboard_full(date_from=today.isoformat(), date_to=mid, db=db)
assert len(swapped["trend"]) == 3
print("[OK] Reversed date_from/date_to are swapped gracefully")

# Invalid date -> 400
from fastapi import HTTPException

try:
    get_dashboard_full(date_from="not-a-date", date_to=None, db=db)
    print("[FAIL] Expected 400 for invalid date")
    raise SystemExit(1)
except HTTPException as e:
    assert e.status_code == 400
    print("[OK] Invalid date returns 400")

# Truly empty database: 404 (frontend cue for demo fallback)
db.query(DailyMetrics).delete()
db.commit()
try:
    get_dashboard_full(date_from=None, date_to=None, db=db)
    print("[FAIL] Expected 404 for empty database")
    raise SystemExit(1)
except HTTPException as e:
    assert e.status_code == 404
    print("[OK] Truly empty database returns 404 (frontend falls back to demo)")

db.close()
print("\n[OK] All assertions passed")
