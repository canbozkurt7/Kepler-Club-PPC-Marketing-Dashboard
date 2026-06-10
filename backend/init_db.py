#!/usr/bin/env python3
"""Initialize the database with tables, locations, platforms, and default alert rules."""

import sys
from app.database import init_db, SessionLocal
from app.models import Platform, Location, AlertRule

def initialize_database():
    """Create all database tables."""
    print("Creating database tables...")
    try:
        init_db()
        print("[OK] Database tables created")
    except Exception as e:
        print(f"[ERROR] Failed to create tables: {str(e)}")
        return False

    return True


def seed_platforms():
    """Add platform entries (google, meta, yandex)."""
    db = SessionLocal()
    try:
        # Check if platforms already exist
        if db.query(Platform).count() > 0:
            print("Platforms already exist, skipping...")
            return True

        platforms = [
            Platform(name="google"),
            Platform(name="meta"),
            Platform(name="yandex"),
        ]

        for plat in platforms:
            db.add(plat)

        db.commit()
        print(f"[OK] Added {len(platforms)} platforms")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to seed platforms: {str(e)}")
        db.rollback()
        return False

    finally:
        db.close()


def seed_locations():
    """Add location entries (SAW Istanbul, KLIA Kuala Lumpur, RIX Riga)."""
    db = SessionLocal()
    try:
        # Check if locations already exist
        if db.query(Location).count() > 0:
            print("Locations already exist, skipping...")
            return True

        locations = [
            Location(code="SAW", name="Istanbul", timezone="UTC+3"),
            Location(code="KLIA", name="Kuala Lumpur", timezone="UTC+8"),
            Location(code="RIX", name="Riga", timezone="UTC+2"),
        ]

        for loc in locations:
            db.add(loc)

        db.commit()
        print(f"[OK] Added {len(locations)} locations")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to seed locations: {str(e)}")
        db.rollback()
        return False

    finally:
        db.close()


def seed_alert_rules():
    """Add default alert rules."""
    db = SessionLocal()
    try:
        # Check if rules already exist
        if db.query(AlertRule).count() > 0:
            print("Alert rules already exist, skipping...")
            return True

        rules = [
            AlertRule(
                location_id=None,  # All locations
                alert_type="roas_drop_critical",
                metric_name="roas",
                operator="<",
                threshold=1.5,
                severity="CRITICAL",
                notify_channels="email,dashboard",
                enabled=True,
            ),
            AlertRule(
                location_id=None,
                alert_type="roas_drop_high",
                metric_name="roas",
                operator="<",
                threshold=2.0,
                severity="HIGH",
                notify_channels="dashboard",
                enabled=True,
            ),
            AlertRule(
                location_id=None,
                alert_type="cpa_spike",
                metric_name="cpa",
                operator=">",
                threshold=200.0,
                severity="HIGH",
                notify_channels="email,dashboard",
                enabled=True,
            ),
            AlertRule(
                location_id=None,
                alert_type="zero_conversions",
                metric_name="conversions",
                operator="==",
                threshold=0,
                severity="CRITICAL",
                notify_channels="email,dashboard",
                enabled=True,
            ),
            AlertRule(
                location_id=None,
                alert_type="low_ctr",
                metric_name="ctr",
                operator="<",
                threshold=2.0,
                severity="LOW",
                notify_channels="dashboard",
                enabled=True,
            ),
        ]

        for rule in rules:
            db.add(rule)

        db.commit()
        print(f"[OK] Added {len(rules)} alert rules")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to seed alert rules: {str(e)}")
        db.rollback()
        return False

    finally:
        db.close()


def main():
    """Run all initialization steps."""
    print("=" * 80)
    print("PPC Marketing Dashboard - Database Initialization")
    print("=" * 80)
    print()

    if not initialize_database():
        sys.exit(1)

    if not seed_platforms():
        sys.exit(1)

    if not seed_locations():
        sys.exit(1)

    if not seed_alert_rules():
        sys.exit(1)

    print()
    print("=" * 80)
    print("[SUCCESS] Database initialization complete!")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Update .env with your Google Ads credentials")
    print("2. Run: python -m uvicorn app.main:app --reload")
    print("3. Open: http://localhost:8000/docs")
    print()


if __name__ == "__main__":
    main()
