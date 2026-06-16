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


# Campaign-name prefix → location code (KUL maps to KLIA).
_META_LOCATION = {"SAW": "SAW", "KUL": "KLIA", "KLIA": "KLIA", "RIX": "RIX"}


def _meta_location(name: str) -> str:
    prefix = (name or "").strip().split()[0].upper() if name else ""
    return _META_LOCATION.get(prefix, "SAW")


def _meta_ad_insights(
    client: httpx.Client, account_id: str, access_token: str, since: str, until: str
) -> List[Dict[str, Any]]:
    """One row per ad over [since, until] — window-level ctr/cpm/frequency."""
    params: Dict[str, Any] = {
        "access_token": access_token,
        "fields": "ad_id,ad_name,campaign_name,impressions,clicks,spend,frequency,ctr,cpm",
        "level": "ad",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "limit": 200,
    }
    url: Optional[str] = f"{GRAPH_URL}/act_{account_id}/insights"
    rows: List[Dict[str, Any]] = []
    while url:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        body = resp.json()
        if "error" in body:
            logger.error(f"Meta creative insights error: {body['error']}")
            break
        rows.extend(body.get("data", []))
        url = body.get("paging", {}).get("next")
        params = {}
    return rows


def fetch_meta_creatives(
    date_from: str, date_to: str, top_n: int = 30
) -> List[Dict[str, Any]]:
    """Ad-level creatives with fatigue signals (frequency + CTR/CPM vs the prior
    equal-length window), mapped to the frontend MetaCreative shape. [] on any
    failure or when credentials are missing.
    """
    access_token = os.getenv("META_ACCESS_TOKEN")
    account_id = os.getenv("META_AD_ACCOUNT_ID")
    if not access_token or not account_id:
        return []

    try:
        d_from = datetime.strptime(date_from, "%Y-%m-%d").date()
        d_to = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        return []

    window_days = (d_to - d_from).days
    prev_to = d_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=window_days)

    out: List[Dict[str, Any]] = []
    try:
        with httpx.Client(timeout=30) as client:
            cur = _meta_ad_insights(client, account_id, access_token, date_from, date_to)
            prev = _meta_ad_insights(
                client, account_id, access_token, prev_from.isoformat(), prev_to.isoformat()
            )

        prev_by_ad = {
            r.get("ad_id"): {
                "ctr": float(r.get("ctr") or 0),
                "cpm": float(r.get("cpm") or 0),
            }
            for r in prev
        }

        for r in cur:
            ad_id = r.get("ad_id")
            ctr = float(r.get("ctr") or 0)
            cpm = float(r.get("cpm") or 0)
            p = prev_by_ad.get(ad_id, {"ctr": ctr, "cpm": cpm})
            out.append({
                "id": ad_id,
                "name": r.get("ad_name", ""),
                "campaign": r.get("campaign_name", ""),
                "location": _meta_location(r.get("campaign_name", "")),
                "status": "ACTIVE",
                "impressions": int(r.get("impressions") or 0),
                "frequency": round(float(r.get("frequency") or 0), 2),
                "ctr": round(ctr, 2),
                "ctrPrev": round(p["ctr"], 2),
                "cpm": round(cpm, 2),
                "cpmPrev": round(p["cpm"], 2),
                "spend": round(float(r.get("spend") or 0), 2),
                "daysRunning": window_days + 1,
            })
    except Exception as e:
        logger.error(f"Meta creative fetch failed: {e}")
        return []

    out.sort(key=lambda x: x["impressions"], reverse=True)
    return out[:top_n]
