"""Microsoft Clarity friction metrics fetcher.

Uses the Clarity Data Export API:
https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export

Rate limit: 10 requests per project per day, numOfDays capped at 3 —
so the sync job only calls this a few times a day, never hourly.
"""

import logging
import os
from datetime import date

import httpx

logger = logging.getLogger(__name__)

CLARITY_EXPORT_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights"


def _to_int(value) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def fetch_clarity_metrics(days: int = 1) -> dict:
    """Fetch site-wide friction metrics for the last `days` days (max 3).

    Returns {"metrics": {"site-wide": {...}}} or {"error": ..., "metrics": {}}.
    """
    api_key = os.getenv("CLARITY_API_KEY")
    if not api_key:
        return {"error": "Clarity credentials not configured", "metrics": {}}

    num_of_days = min(max(days, 1), 3)

    try:
        resp = httpx.get(
            CLARITY_EXPORT_URL,
            params={"numOfDays": num_of_days},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30,
        )
        resp.raise_for_status()
        payload = resp.json()
    except httpx.HTTPStatusError as e:
        # 429 = daily rate limit (10/day) exhausted — expected occasionally
        return {"error": f"Clarity API HTTP {e.response.status_code}", "metrics": {}}
    except Exception as e:
        return {"error": f"Clarity API request failed: {e}", "metrics": {}}

    sessions = 0
    dead_clicks = 0
    rage_clicks = 0
    bounce_rate = 0.0
    avg_load_ms = 0.0

    # Payload is a list of {metricName, information: [...]} blocks; parse
    # defensively because field names vary between metrics.
    for metric in payload if isinstance(payload, list) else []:
        name = metric.get("metricName", "")
        info = metric.get("information") or []
        if not info:
            continue
        first = info[0]
        if name == "Traffic":
            sessions = _to_int(first.get("totalSessionCount"))
        elif name == "DeadClickCount":
            dead_clicks = sum(_to_int(i.get("subTotal")) for i in info)
        elif name == "RageClickCount":
            rage_clicks = sum(_to_int(i.get("subTotal")) for i in info)
        elif name in ("PagesPerSession", "Bounce"):
            bounce_rate = _to_float(first.get("sessionsWithMetricPercentage"))

    return {
        "source": "clarity",
        "syncDate": date.today().isoformat(),
        "metrics": {
            "site-wide": {
                "totalSessions": sessions,
                "deadClickCount": dead_clicks,
                "rageClickCount": rage_clicks,
                "bounceRate": bounce_rate,
                "avgPageLoadMs": avg_load_ms,
            }
        },
    }
