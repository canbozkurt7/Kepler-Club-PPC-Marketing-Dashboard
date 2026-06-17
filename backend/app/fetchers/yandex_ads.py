"""Yandex Direct Ads fetcher via the Reports API (v5).

The Reports API is asynchronous: a POST either returns the TSV body (200) or a
"still preparing" status (201/202) with a `retryIn` header. We poll until the
report is ready, then parse the TSV into the row shape that
DataNormalizer.normalize_metrics expects for platform='yandex'.

Returns [] when the token is missing or the API errors, so a missing token
simply yields an empty Yandex section rather than breaking the sync.
"""

import csv
import io
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

REPORTS_URL = "https://api.direct.yandex.com/json/v5/reports"

# Report fields we request, in order. Cost comes back in account currency
# (RUB) because we send returnMoneyInMicros=false.
_FIELD_NAMES = [
    "CampaignId",
    "CampaignName",
    "AdGroupId",
    "AdGroupName",
    "Date",
    "Impressions",
    "Clicks",
    "Cost",
    "Conversions",
]


def _to_int(value: Any) -> int:
    """Yandex emits '--' for empty numeric cells; coerce those to 0."""
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def fetch_yandex_metrics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch campaign/ad-group daily stats from Yandex Direct.

    Returns rows shaped for DataNormalizer.normalize_metrics(platform='yandex'):
      campaign_id, campaign_name, ad_group_id, ad_group_name, metric_date,
      impressions, clicks, spend (RUB — the normalizer converts it),
      conversions, conversion_value.
    """
    token = os.getenv("YANDEX_API_TOKEN")
    if not token:
        logger.warning("Yandex Ads token not configured — skipping sync")
        return []

    # Default window matches Google/Meta: yesterday + today.
    if date_to is None:
        date_to = datetime.utcnow().strftime("%Y-%m-%d")
    if date_from is None:
        date_from = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept-Language": "en",
        "processingMode": "auto",
        "returnMoneyInMicros": "false",
        "skipReportHeader": "true",
        "skipReportSummary": "true",
        "Content-Type": "application/json; charset=utf-8",
    }
    # Agency tokens must name the advertiser account; direct advertisers don't.
    client_login = os.getenv("YANDEX_CLIENT_LOGIN")
    if client_login:
        headers["Client-Login"] = client_login

    # ReportName must be unique per request — Yandex caches results by name.
    report_name = f"kepler-{date_from}-{date_to}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    body = {
        "params": {
            "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
            "FieldNames": _FIELD_NAMES,
            "ReportName": report_name,
            "ReportType": "CUSTOM_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "YES",
            "IncludeDiscount": "NO",
        }
    }

    tsv: Optional[str] = None
    try:
        with httpx.Client(timeout=60) as client:
            for _ in range(10):
                resp = client.post(REPORTS_URL, headers=headers, json=body)
                if resp.status_code == 200:
                    tsv = resp.text
                    break
                if resp.status_code in (201, 202):
                    retry_in = _to_int(resp.headers.get("retryIn", 5)) or 5
                    logger.info(f"Yandex report preparing — retrying in {retry_in}s")
                    time.sleep(min(retry_in, 10))
                    continue
                logger.error(
                    f"Yandex report error {resp.status_code}: {resp.text[:500]}"
                )
                return []
    except Exception as e:
        logger.error(f"Yandex Ads fetch failed: {e}")
        return []

    if tsv is None:
        logger.error("Yandex report not ready after polling — giving up")
        return []

    rows: List[Dict[str, Any]] = []
    # skipReportHeader drops the title line, so the first TSV line is the
    # column-name header that DictReader needs.
    reader = csv.DictReader(io.StringIO(tsv), delimiter="\t")
    for row in reader:
        rows.append(
            {
                "campaign_id": row.get("CampaignId"),
                "campaign_name": row.get("CampaignName", ""),
                "ad_group_id": row.get("AdGroupId"),
                "ad_group_name": row.get("AdGroupName", ""),
                "metric_date": row.get("Date"),
                "impressions": _to_int(row.get("Impressions")),
                "clicks": _to_int(row.get("Clicks")),
                # RUB; DataNormalizer multiplies by rub_to_eur.
                "spend": _to_float(row.get("Cost")),
                "conversions": _to_int(row.get("Conversions")),
                "conversion_value": 0.0,  # Yandex Direct doesn't report value
                "platform": "yandex",
            }
        )

    logger.info(
        f"Yandex Ads fetch: {len(rows)} campaign/ad-group-day rows "
        f"({date_from} → {date_to})"
    )
    return rows
