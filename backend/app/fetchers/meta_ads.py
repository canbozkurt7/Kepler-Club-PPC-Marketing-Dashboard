"""Meta (Facebook/Instagram) Ads fetcher via Marketing API v19."""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/v19.0"

# Action types that count as conversions.
# Kepler Club campaigns are mostly awareness/traffic — add_to_cart is the
# deepest funnel action available until purchase pixel events are configured.
CONVERSION_ACTION_TYPES = {
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "omni_purchase",
    "add_to_cart",
    "offsite_conversion.fb_pixel_add_to_cart",
    "omni_add_to_cart",
    "lead",
    "offsite_conversion.fb_pixel_lead",
    "complete_registration",
}


def _sum_actions(actions: Optional[List[Dict]], target_types: set) -> float:
    """Sum values for matching action types in a Meta actions/action_values list."""
    if not actions:
        return 0.0
    return sum(
        float(a.get("value", 0))
        for a in actions
        if a.get("action_type") in target_types
    )


def fetch_meta_metrics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch adset-level daily insights from Meta Marketing API.

    Returns records in the same shape that DataNormalizer.normalize_metrics
    expects for platform='meta':
      campaign_id, campaign_name, ad_group_id, ad_group_name,
      metric_date, impressions, clicks, spend, conversions, conversion_value
    """
    access_token = os.getenv("META_ACCESS_TOKEN")
    account_id = os.getenv("META_AD_ACCOUNT_ID")

    if not access_token or not account_id:
        logger.warning("Meta Ads credentials not configured — skipping sync")
        return []

    # Default: yesterday + today (same window as Google Ads)
    if date_to is None:
        date_to = datetime.utcnow().strftime("%Y-%m-%d")
    if date_from is None:
        date_from = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    # Detect account currency so the normalizer can skip conversion for TRY
    account_currency = "USD"
    try:
        with httpx.Client(timeout=10) as client:
            cur_resp = client.get(
                f"{GRAPH_URL}/act_{account_id}",
                params={"access_token": access_token, "fields": "currency"},
            )
            account_currency = cur_resp.json().get("currency", "USD")
    except Exception:
        pass

    params = {
        "access_token": access_token,
        "fields": (
            "campaign_id,campaign_name,adset_id,adset_name,"
            "impressions,clicks,spend,actions,action_values"
        ),
        "level": "adset",
        "time_increment": "1",
        "time_range": f'{{"since":"{date_from}","until":"{date_to}"}}',
        "limit": 500,
    }

    url = f"{GRAPH_URL}/act_{account_id}/insights"
    records: List[Dict[str, Any]] = []

    try:
        with httpx.Client(timeout=30) as client:
            while url:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                body = resp.json()

                if "error" in body:
                    logger.error(f"Meta API error: {body['error']}")
                    break

                for row in body.get("data", []):
                    conversions = _sum_actions(row.get("actions"), CONVERSION_ACTION_TYPES)
                    conv_value = _sum_actions(row.get("action_values"), CONVERSION_ACTION_TYPES)

                    records.append({
                        "campaign_id": row.get("campaign_id"),
                        "campaign_name": row.get("campaign_name", ""),
                        "ad_group_id": row.get("adset_id"),
                        "ad_group_name": row.get("adset_name", ""),
                        "metric_date": row.get("date_start"),
                        "impressions": int(row.get("impressions") or 0),
                        "clicks": int(row.get("clicks") or 0),
                        "spend": float(row.get("spend") or 0),
                        "conversions": int(conversions),
                        "conversion_value": conv_value,
                        "platform": "meta",
                        "account_currency": account_currency,
                    })

                # Follow pagination
                paging = body.get("paging", {})
                url = paging.get("next")
                params = {}  # next URL already has all params baked in

        logger.info(
            f"Meta Ads fetch: {len(records)} adset-day rows "
            f"({date_from} → {date_to})"
        )
        return records

    except httpx.HTTPStatusError as e:
        logger.error(f"Meta API HTTP error {e.response.status_code}: {e.response.text}")
        return []
    except Exception as e:
        logger.error(f"Meta Ads fetch failed: {e}")
        return []
