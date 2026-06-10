import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ...database import get_db
from ...models import DailyMetrics, Location, Platform
from ...processors.enricher import DataEnricher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["dashboard"])


@router.get("/dashboard/summary")
def get_dashboard_summary(
    date_from: Optional[str] = Query(None, description="Date from (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Date to (YYYY-MM-DD)"),
    location: Optional[str] = Query(None, description="Location code (SAW, KLIA, RIX)"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get aggregated dashboard summary for the given date range and location."""

    # Default to last 30 days
    if not date_to:
        date_to = datetime.utcnow().date()
    else:
        date_to = datetime.strptime(date_to, "%Y-%m-%d").date()

    if not date_from:
        date_from = date_to - timedelta(days=30)
    else:
        date_from = datetime.strptime(date_from, "%Y-%m-%d").date()

    # Base query
    query = db.query(DailyMetrics).filter(
        DailyMetrics.metric_date >= date_from,
        DailyMetrics.metric_date <= date_to,
    )

    # Filter by location if provided
    if location:
        loc = db.query(Location).filter(Location.code == location.upper()).first()
        if loc:
            query = query.filter(DailyMetrics.location_id == loc.id)

    metrics = query.all()

    # Aggregate metrics
    aggregate = {
        "total_impressions": sum(m.impressions for m in metrics),
        "total_clicks": sum(m.clicks for m in metrics),
        "total_conversions": sum(m.conversions for m in metrics),
        "total_spend_eur": sum(m.spend_eur for m in metrics),
        "total_conversion_value_eur": sum(m.conversion_value_eur for m in metrics),
    }

    # Enrich with KPIs
    aggregate_enriched = DataEnricher.enrich_aggregated(aggregate)

    # By location breakdown
    locations = db.query(Location).all()
    by_location = {}
    for loc in locations:
        loc_metrics = [m for m in metrics if m.location_id == loc.id]
        if loc_metrics:
            loc_agg = {
                "code": loc.code,
                "name": loc.name,
                "impressions": sum(m.impressions for m in loc_metrics),
                "clicks": sum(m.clicks for m in loc_metrics),
                "conversions": sum(m.conversions for m in loc_metrics),
                "spend_eur": sum(m.spend_eur for m in loc_metrics),
                "conversion_value_eur": sum(m.conversion_value_eur for m in loc_metrics),
            }
            loc_agg_enriched = DataEnricher.enrich_aggregated(loc_agg)
            by_location[loc.code] = loc_agg_enriched

    # By platform breakdown
    platforms = db.query(Platform).all()
    by_platform = {}
    for plat in platforms:
        plat_metrics = [m for m in metrics if m.platform_id == plat.id]
        if plat_metrics:
            plat_agg = {
                "impressions": sum(m.impressions for m in plat_metrics),
                "clicks": sum(m.clicks for m in plat_metrics),
                "conversions": sum(m.conversions for m in plat_metrics),
                "spend_eur": sum(m.spend_eur for m in plat_metrics),
                "conversion_value_eur": sum(m.conversion_value_eur for m in plat_metrics),
            }
            plat_agg_enriched = DataEnricher.enrich_aggregated(plat_agg)
            by_platform[plat.name] = plat_agg_enriched

    return {
        "period": {
            "start_date": date_from.isoformat(),
            "end_date": date_to.isoformat(),
        },
        "aggregate_metrics": aggregate_enriched,
        "by_location": by_location,
        "by_platform": by_platform,
        "record_count": len(metrics),
    }


@router.get("/campaigns")
def get_campaigns(
    location: Optional[str] = Query(None),
    sort_by: str = Query("roas", description="Sort by: roas, cpa, spend, conversions"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Get campaigns with their aggregated metrics."""

    query = db.query(DailyMetrics)

    if location:
        loc = db.query(Location).filter(Location.code == location.upper()).first()
        if loc:
            query = query.filter(DailyMetrics.location_id == loc.id)

    # Get last 30 days
    date_from = datetime.utcnow().date() - timedelta(days=30)
    query = query.filter(DailyMetrics.metric_date >= date_from)

    metrics = query.all()

    # Group by campaign_id
    campaigns_dict = {}
    for m in metrics:
        if m.campaign_id not in campaigns_dict:
            campaigns_dict[m.campaign_id] = {
                "campaign_id": m.campaign_id,
                "impressions": 0,
                "clicks": 0,
                "conversions": 0,
                "spend_eur": 0,
                "conversion_value_eur": 0,
            }
        campaigns_dict[m.campaign_id]["impressions"] += m.impressions
        campaigns_dict[m.campaign_id]["clicks"] += m.clicks
        campaigns_dict[m.campaign_id]["conversions"] += m.conversions
        campaigns_dict[m.campaign_id]["spend_eur"] += m.spend_eur
        campaigns_dict[m.campaign_id]["conversion_value_eur"] += m.conversion_value_eur

    # Enrich with KPIs
    campaigns_list = [DataEnricher.enrich_aggregated(c) for c in campaigns_dict.values()]

    # Sort
    sort_key = sort_by if sort_by in ["roas", "cpa_eur", "spend_eur", "conversions"] else "roas"
    campaigns_list.sort(
        key=lambda x: x.get(sort_key, 0) or 0,
        reverse=sort_key != "cpa_eur"  # CPA sorted ascending
    )

    return campaigns_list


@router.get("/alerts")
def get_alerts(
    status: Optional[str] = Query(None, description="TRIGGERED, ACKNOWLEDGED, RESOLVED"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Get recent alerts."""
    from ...models.alert_history import AlertHistory

    query = db.query(AlertHistory).order_by(AlertHistory.triggered_at.desc())

    if status:
        query = query.filter(AlertHistory.alert_status == status.upper())

    # Last 100 alerts
    alerts = query.limit(100).all()

    return [
        {
            "id": a.id,
            "rule_id": a.rule_id,
            "alert_type": a.rule.alert_type,
            "severity": a.rule.severity,
            "metric_name": a.rule.metric_name,
            "metric_value": a.metric_value,
            "threshold": a.rule.threshold,
            "triggered_at": a.triggered_at.isoformat(),
            "status": a.alert_status,
        }
        for a in alerts
    ]
