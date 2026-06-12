"""Google Analytics 4 Data API fetcher."""

import logging
import os
from datetime import date, timedelta

logger = logging.getLogger(__name__)


def _get_credentials():
    """Build OAuth2 credentials from env vars."""
    from google.oauth2.credentials import Credentials

    return Credentials(
        token=None,
        refresh_token=os.getenv("GA4_REFRESH_TOKEN"),
        client_id=os.getenv("GA4_CLIENT_ID"),
        client_secret=os.getenv("GA4_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )


def fetch_ga4_metrics(date_from: date = None, date_to: date = None) -> dict:
    """Fetch GA4 sessions, engagement, channels, devices, countries, pages.

    Returns a dict matching the Ga4Snapshot shape expected by the frontend.
    """
    if not all([
        os.getenv("GA4_PROPERTY_ID"),
        os.getenv("GA4_REFRESH_TOKEN"),
        os.getenv("GA4_CLIENT_ID"),
        os.getenv("GA4_CLIENT_SECRET"),
    ]):
        return {"error": "GA4 credentials not configured"}

    property_id = os.getenv("GA4_PROPERTY_ID")

    if date_to is None:
        date_to = date.today()
    if date_from is None:
        date_from = date_to - timedelta(days=29)

    start = date_from.strftime("%Y-%m-%d")
    end = date_to.strftime("%Y-%m-%d")

    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            RunReportRequest,
        )
        from google.auth.transport.requests import Request

        creds = _get_credentials()
        creds.refresh(Request())

        client = BetaAnalyticsDataClient(credentials=creds)
        date_range = DateRange(start_date=start, end_date=end)

        # --- Site-wide KPIs ---
        kpi_resp = client.run_report(RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[date_range],
            metrics=[
                Metric(name="sessions"),
                Metric(name="engagedSessions"),
                Metric(name="engagementRate"),
                Metric(name="averageSessionDuration"),
                Metric(name="conversions"),
                Metric(name="totalRevenue"),
            ],
        ))

        sessions = 0
        engaged = 0
        engagement_rate = 0.0
        avg_session_sec = 0
        conversions = 0
        revenue = 0.0

        if kpi_resp.rows:
            v = kpi_resp.rows[0].metric_values
            sessions = int(float(v[0].value or 0))
            engaged = int(float(v[1].value or 0))
            engagement_rate = round(float(v[2].value or 0) * 100, 1)
            avg_session_sec = int(float(v[3].value or 0))
            conversions = int(float(v[4].value or 0))
            revenue = round(float(v[5].value or 0), 2)

        # --- Traffic channels ---
        ch_resp = client.run_report(RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[date_range],
            dimensions=[Dimension(name="sessionDefaultChannelGroup")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="conversions"),
                Metric(name="totalRevenue"),
            ],
            limit=10,
        ))

        channels = []
        for row in ch_resp.rows:
            ch_sessions = int(float(row.metric_values[0].value or 0))
            ch_conversions = int(float(row.metric_values[1].value or 0))
            ch_revenue = round(float(row.metric_values[2].value or 0), 2)
            channels.append({
                "channel": row.dimension_values[0].value,
                "sessions": ch_sessions,
                "conversions": ch_conversions,
                "revenue": ch_revenue,
            })
        channels.sort(key=lambda x: x["sessions"], reverse=True)

        # --- Device breakdown ---
        dev_resp = client.run_report(RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[date_range],
            dimensions=[Dimension(name="deviceCategory")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="conversions"),
                Metric(name="totalRevenue"),
            ],
        ))

        devices = []
        for row in dev_resp.rows:
            devices.append({
                "device": row.dimension_values[0].value,
                "sessions": int(float(row.metric_values[0].value or 0)),
                "conversions": int(float(row.metric_values[1].value or 0)),
                "revenue": round(float(row.metric_values[2].value or 0), 2),
            })

        # --- Top countries ---
        geo_resp = client.run_report(RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[date_range],
            dimensions=[Dimension(name="country")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="conversions"),
            ],
            limit=10,
        ))

        countries = []
        for row in geo_resp.rows:
            countries.append({
                "country": row.dimension_values[0].value,
                "sessions": int(float(row.metric_values[0].value or 0)),
                "conversions": int(float(row.metric_values[1].value or 0)),
            })

        # --- Top pages ---
        pages_resp = client.run_report(RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[date_range],
            dimensions=[Dimension(name="pageTitle")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="conversions"),
                Metric(name="totalRevenue"),
            ],
            limit=10,
        ))

        pages = []
        for row in pages_resp.rows:
            pages.append({
                "title": row.dimension_values[0].value,
                "sessions": int(float(row.metric_values[0].value or 0)),
                "conversions": int(float(row.metric_values[1].value or 0)),
                "revenue": round(float(row.metric_values[2].value or 0), 2),
            })

        logger.info(
            f"GA4 sync: {sessions} sessions, {conversions} conversions, "
            f"{len(channels)} channels ({start} → {end})"
        )

        return {
            "sessions": sessions,
            "engagedSessions": engaged,
            "engagementRate": engagement_rate,
            "avgSessionSec": avg_session_sec,
            "conversions": conversions,
            "revenue": revenue,
            "topChannels": channels,
            "devices": devices,
            "countries": countries,
            "pages": pages,
        }

    except Exception as e:
        logger.error(f"GA4 fetch failed: {e}")
        return {"error": str(e)}
