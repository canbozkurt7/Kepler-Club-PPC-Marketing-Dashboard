#!/usr/bin/env python3
"""One-time backfill of daily Clarity friction metrics.

Replaces the duplicated aggregate rows with one honest row per day,
using the real daily export from the Clarity dashboard (June 2026).
Run inside the API container:  python seed_clarity_daily.py
"""

from datetime import datetime

from app.database import SessionLocal
from app.models import ClarityFrictionMetrics, Location

# (date, sessions, dead_clicks, rage_clicks, bounce_rate_pct, avg_load_ms)
DAILY = [
    ("2026-06-09", 808, 243, 3, 79.70, 10145.44),
    ("2026-06-10", 2047, 605, 22, 81.58, 8722.90),
    ("2026-06-11", 1961, 605, 30, 82.36, 8940.40),
    ("2026-06-12", 419, 134, 0, 76.13, 11961.26),
]


def main():
    db = SessionLocal()
    try:
        anchor = db.query(Location).order_by(Location.id).first()
        if not anchor:
            raise SystemExit("No locations in database — run a sync first.")

        deleted = (
            db.query(ClarityFrictionMetrics)
            .filter(ClarityFrictionMetrics.page_url == "site-wide")
            .delete()
        )
        print(f"Removed {deleted} old site-wide rows")

        for iso, sessions, dead, rage, bounce, load_ms in DAILY:
            db.add(
                ClarityFrictionMetrics(
                    location_id=anchor.id,
                    friction_date=datetime.strptime(iso, "%Y-%m-%d").date(),
                    page_url="site-wide",
                    sessions=sessions,
                    dead_clicks=dead,
                    rage_clicks=rage,
                    bounce_rate=bounce,
                    avg_load_time_ms=load_ms,
                )
            )
            print(f"  + {iso}: {sessions} sessions, {dead} dead clicks")

        db.commit()
        print(f"Seeded {len(DAILY)} daily Clarity rows")
    finally:
        db.close()


if __name__ == "__main__":
    main()
