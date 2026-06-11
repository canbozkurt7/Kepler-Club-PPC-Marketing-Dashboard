"""Full dashboard payload — the single endpoint the React frontend consumes.

Returns the complete DashboardData shape (camelCase, matching
frontend/src/data/types.ts). Responds 404 while the database has no synced
metrics yet, which makes the frontend fall back to its demo dataset.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ...database import get_db
from ...models import Campaign, DailyMetrics, Location, Platform
from ...models.alert_history import AlertHistory
from ...models.clarity_metrics import ClarityFrictionMetrics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["dashboard"])

PLATFORM_KEYS = ("google", "meta", "yandex")

CITY_BY_CODE = {
    "SAW": "Istanbul",
    "KLIA": "Kuala Lumpur",
    "RIX": "Riga",
}

EMPTY_KPIS: Dict[str, Any] = {
    "spend": 0,
    "revenue": 0,
    "conversions": 0,
    "clicks": 0,
    "impressions": 0,
    "roas": 0,
    "cpa": 0,
    "ctr": 0,
    "cpc": 0,
}


def _kpis(rows: List[DailyMetrics]) -> Dict[str, Any]:
    spend = sum(r.spend_eur or 0 for r in rows)
    revenue = sum(r.conversion_value_eur or 0 for r in rows)
    conversions = sum(r.conversions or 0 for r in rows)
    clicks = sum(r.clicks or 0 for r in rows)
    impressions = sum(r.impressions or 0 for r in rows)
    return {
        "spend": round(spend, 2),
        "revenue": round(revenue, 2),
        "conversions": conversions,
        "clicks": clicks,
        "impressions": impressions,
        "roas": round(revenue / spend, 2) if spend > 0 else 0,
        "cpa": round(spend / conversions, 2) if conversions > 0 else 0,
        "ctr": round(clicks / impressions * 100, 2) if impressions > 0 else 0,
        "cpc": round(spend / clicks, 2) if clicks > 0 else 0,
    }


def _trend(rows: List[DailyMetrics]) -> List[Dict[str, Any]]:
    by_date: Dict[str, Dict[str, float]] = defaultdict(
        lambda: {"spend": 0.0, "revenue": 0.0, "conversions": 0}
    )
    for r in rows:
        d = by_date[r.metric_date.isoformat()]
        d["spend"] += r.spend_eur or 0
        d["revenue"] += r.conversion_value_eur or 0
        d["conversions"] += r.conversions or 0

    points = []
    for date in sorted(by_date):
        d = by_date[date]
        points.append(
            {
                "date": date,
                "spend": round(d["spend"], 2),
                "revenue": round(d["revenue"], 2),
                "roas": round(d["revenue"] / d["spend"], 2) if d["spend"] > 0 else 0,
                "conversions": int(d["conversions"]),
            }
        )
    return points


@router.get("/dashboard/full")
def get_dashboard_full(
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD, default 365 days ago"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD, default today"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    try:
        to_date = (
            datetime.strptime(date_to, "%Y-%m-%d").date()
            if date_to
            else datetime.utcnow().date()
        )
        # Default to a year so the dashboard shows all synced history.
        from_date = (
            datetime.strptime(date_from, "%Y-%m-%d").date()
            if date_from
            else to_date - timedelta(days=365)
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD.")

    if from_date > to_date:
        from_date, to_date = to_date, from_date

    rows: List[DailyMetrics] = (
        db.query(DailyMetrics)
        .filter(
            DailyMetrics.metric_date >= from_date,
            DailyMetrics.metric_date <= to_date,
        )
        .all()
    )

    if not rows:
        # 404 ONLY when the database has no metrics at all (first deploy) —
        # the frontend uses that as its cue to fall back to demo data.
        # An empty window over a populated database must return honest zeros,
        # never flip a live dashboard back to demo numbers.
        has_any = db.query(DailyMetrics.id).limit(1).first()
        if has_any is None:
            raise HTTPException(
                status_code=404,
                detail="No metrics synced yet — dashboard will use demo data.",
            )

    platforms = {p.id: p.name for p in db.query(Platform).all()}
    locations = {l.id: l for l in db.query(Location).all()}
    campaigns = {c.id: c for c in db.query(Campaign).all()}

    rows_by_platform: Dict[str, List[DailyMetrics]] = {k: [] for k in PLATFORM_KEYS}
    for r in rows:
        key = platforms.get(r.platform_id)
        if key in rows_by_platform:
            rows_by_platform[key].append(r)

    # --- campaigns ---
    by_campaign: Dict[int, List[DailyMetrics]] = defaultdict(list)
    for r in rows:
        by_campaign[r.campaign_id].append(r)

    campaign_rows = []
    for cid, c_rows in by_campaign.items():
        c = campaigns.get(cid)
        if not c:
            continue
        k = _kpis(c_rows)
        loc = locations.get(c.location_id)
        campaign_rows.append(
            {
                "id": str(cid),
                "name": c.name,
                "platform": platforms.get(c.platform_id, "google"),
                "location": loc.code if loc else "SAW",
                "status": c.status or "ACTIVE",
                **{
                    key: k[key]
                    for key in (
                        "spend",
                        "revenue",
                        "conversions",
                        "clicks",
                        "impressions",
                        "roas",
                        "cpa",
                        "ctr",
                    )
                },
            }
        )
    campaign_rows.sort(key=lambda x: x["spend"], reverse=True)

    # --- locations ---
    by_location: Dict[int, List[DailyMetrics]] = defaultdict(list)
    for r in rows:
        by_location[r.location_id].append(r)

    location_rows = []
    for lid, l_rows in by_location.items():
        loc = locations.get(lid)
        if not loc:
            continue
        k = _kpis(l_rows)
        location_rows.append(
            {
                "code": loc.code,
                "city": CITY_BY_CODE.get(loc.code, loc.name),
                "spend": k["spend"],
                "roas": k["roas"],
                "conversions": k["conversions"],
            }
        )
    location_rows.sort(key=lambda x: x["spend"], reverse=True)

    # --- alerts (last 20, newest first) ---
    alerts = []
    try:
        history = (
            db.query(AlertHistory)
            .order_by(AlertHistory.triggered_at.desc())
            .limit(20)
            .all()
        )
        for a in history:
            rule = a.rule
            loc = locations.get(a.location_id) if a.location_id else None
            alerts.append(
                {
                    "id": str(a.id),
                    "severity": rule.severity if rule else "MEDIUM",
                    "message": (
                        f"{rule.metric_name} {rule.operator} {rule.threshold} breached"
                        f" (value: {a.metric_value})"
                        if rule
                        else "Alert triggered"
                    ),
                    "location": loc.code if loc else "ALL",
                    "platform": "all",
                    "triggeredAt": a.triggered_at.isoformat() if a.triggered_at else "",
                }
            )
    except Exception:
        logger.exception("Failed to load alert history")

    # --- clarity (aggregated from synced friction rows; zeros until Phase 4) ---
    clarity = {
        "totalSessions": 0,
        "deadClickRate": 0,
        "rageClickRate": 0,
        "bounceRate": 0,
        "avgLoadMs": 0,
        "pages": [],
    }
    try:
        friction = (
            db.query(ClarityFrictionMetrics)
            .filter(
                ClarityFrictionMetrics.friction_date >= from_date,
                ClarityFrictionMetrics.friction_date <= to_date,
            )
            .all()
        )
        if friction:
            by_url: Dict[str, List[ClarityFrictionMetrics]] = defaultdict(list)
            for f in friction:
                by_url[f.page_url].append(f)

            pages = []
            for url, f_rows in by_url.items():
                sessions = sum(f.sessions or 0 for f in f_rows)
                pages.append(
                    {
                        "url": url,
                        "sessions": sessions,
                        "deadClicks": sum(f.dead_clicks or 0 for f in f_rows),
                        "rageClicks": sum(f.rage_clicks or 0 for f in f_rows),
                        "bounceRate": round(
                            sum(f.bounce_rate or 0 for f in f_rows) / len(f_rows), 1
                        ),
                        "avgLoadMs": round(
                            sum(f.avg_load_time_ms or 0 for f in f_rows) / len(f_rows)
                        ),
                    }
                )
            pages.sort(key=lambda x: x["sessions"], reverse=True)

            total_sessions = sum(p["sessions"] for p in pages)
            total_dead = sum(p["deadClicks"] for p in pages)
            total_rage = sum(p["rageClicks"] for p in pages)
            clarity = {
                "totalSessions": total_sessions,
                "deadClickRate": round(total_dead / total_sessions * 100, 1)
                if total_sessions
                else 0,
                "rageClickRate": round(total_rage / total_sessions * 100, 1)
                if total_sessions
                else 0,
                "bounceRate": round(
                    sum(p["bounceRate"] for p in pages) / len(pages), 1
                ),
                "avgLoadMs": round(sum(p["avgLoadMs"] for p in pages) / len(pages)),
                "pages": pages[:20],
            }
    except Exception:
        logger.exception("Failed to load clarity metrics")

    # Full span of synced data, independent of the requested window —
    # the frontend uses this to bound its date picker.
    bounds = db.query(
        func.min(DailyMetrics.metric_date), func.max(DailyMetrics.metric_date)
    ).first()

    return {
        "source": "live",
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "dataBounds": {
            "min": bounds[0].isoformat() if bounds and bounds[0] else None,
            "max": bounds[1].isoformat() if bounds and bounds[1] else None,
        },
        "kpis": {
            "blended": _kpis(rows),
            **{key: _kpis(rows_by_platform[key]) for key in PLATFORM_KEYS},
        },
        "trend": _trend(rows),
        "trendByPlatform": {
            key: _trend(rows_by_platform[key]) for key in PLATFORM_KEYS
        },
        "campaigns": campaign_rows,
        "alerts": alerts,
        "locations": location_rows,
        # GA4 integration lands in Phase 4 — zeros keep the tab honest until then
        "ga4": {
            "sessions": 0,
            "engagedSessions": 0,
            "engagementRate": 0,
            "avgSessionSec": 0,
            "conversions": 0,
            "topChannels": [],
        },
        "clarity": clarity,
    }
