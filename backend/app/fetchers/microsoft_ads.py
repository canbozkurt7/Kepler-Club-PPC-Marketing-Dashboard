"""Microsoft Ads (Bing Ads) fetcher via Reporting API v13.

Pulls campaign/ad group daily metrics using the BingAds ReportingService SOAP API.
Returns rows shaped for DataNormalizer.normalize_metrics(platform='microsoft'):
  campaign_id, campaign_name, ad_group_id, ad_group_name, metric_date,
  impressions, clicks, spend (USD), conversions, conversion_value.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from zeep import Client
from zeep.wsse import UsernameToken

logger = logging.getLogger(__name__)

# Microsoft Ads SOAP Reporting Service endpoint (v13)
REPORTING_SERVICE_URL = "https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc?wsdl"


def fetch_microsoft_ads_metrics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch campaign/ad-group daily stats from Microsoft Ads.

    Returns rows shaped for DataNormalizer.normalize_metrics(platform='microsoft'):
      campaign_id, campaign_name, ad_group_id, ad_group_name, metric_date,
      impressions, clicks, spend (USD — no conversion needed),
      conversions, conversion_value.
    """
    developer_token = os.getenv("MICROSOFT_DEVELOPER_TOKEN")
    customer_id = os.getenv("MICROSOFT_CUSTOMER_ID")

    if not developer_token or not customer_id:
        logger.warning(
            "Microsoft Ads credentials not configured (MICROSOFT_DEVELOPER_TOKEN or "
            "MICROSOFT_CUSTOMER_ID missing) — skipping sync"
        )
        return []

    # Default window matches Google/Meta: yesterday + today.
    if date_to is None:
        date_to = datetime.utcnow().strftime("%Y-%m-%d")
    if date_from is None:
        date_from = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    try:
        # Initialize SOAP client with developer token auth
        client = Client(
            wsdl=REPORTING_SERVICE_URL,
            wsse=UsernameToken(
                username="",
                password=developer_token,
                use_digest=False,
            ),
        )

        # Build the report request
        # ReportRequest type varies; we'll use CampaignPerformanceReportRequest
        report_request = {
            "ExcludeColumnHeadersAndFooters": True,
            "Format": "Tsv",
            "ReportName": f"Kepler-{date_from}-{date_to}",
            "ReturnOnlyCompleteData": False,
            "Time": {
                "CustomDateRangeStart": {
                    "Day": int(date_from.split("-")[2]),
                    "Month": int(date_from.split("-")[1]),
                    "Year": int(date_from.split("-")[0]),
                },
                "CustomDateRangeEnd": {
                    "Day": int(date_to.split("-")[2]),
                    "Month": int(date_to.split("-")[1]),
                    "Year": int(date_to.split("-")[0]),
                },
            },
            "Columns": [
                "CampaignId",
                "CampaignName",
                "AdGroupId",
                "AdGroupName",
                "TimePeriod",
                "Impressions",
                "Clicks",
                "Spend",
                "Conversions",
                "ConversionValue",
            ],
        }

        # Submit report request
        logger.info(f"Submitting Microsoft Ads report request ({date_from} → {date_to})")
        response = client.service.SubmitGenerateReport(
            reportRequest=report_request,
            customerId=customer_id,
        )

        report_request_id = response
        logger.info(f"Report request submitted: {report_request_id}")

        # Poll for report completion (max 10 retries, 30 sec each)
        report_data = None
        for attempt in range(10):
            logger.info(f"Polling report status (attempt {attempt + 1}/10)...")
            status_response = client.service.GetReportRequestStatus(
                reportRequestId=report_request_id
            )

            if status_response is None:
                logger.error("GetReportRequestStatus returned None")
                return []

            # Status: 0=Pending, 1=InProgress, 2=Completed, 3=CompletedWithErrors
            status = status_response.get("Status") if isinstance(status_response, dict) else None

            if status == 2:  # Completed
                # Download report
                report_data = client.service.GetReportDownloadUrl(
                    reportRequestId=report_request_id
                )
                logger.info(f"Report ready: {report_data}")
                break
            elif status in (0, 1):  # Pending or InProgress
                logger.info(f"Report status: {status}, retrying in 30s...")
                import time

                time.sleep(30)
            else:
                logger.error(f"Report request failed with status: {status}")
                return []

        if not report_data:
            logger.error("Report not ready after polling — giving up")
            return []

        # Parse TSV report data
        rows: List[Dict[str, Any]] = []
        if isinstance(report_data, str):
            lines = report_data.strip().split("\n")
            # Skip header
            if len(lines) > 1:
                headers = lines[0].split("\t")
                for line in lines[1:]:
                    parts = line.split("\t")
                    if len(parts) >= len(headers):
                        row_dict = dict(zip(headers, parts))
                        rows.append(
                            {
                                "campaign_id": row_dict.get("CampaignId", "").strip(),
                                "campaign_name": row_dict.get("CampaignName", "").strip(),
                                "ad_group_id": row_dict.get("AdGroupId", "").strip(),
                                "ad_group_name": row_dict.get("AdGroupName", "").strip(),
                                "metric_date": row_dict.get("TimePeriod", "").strip(),
                                "impressions": int(
                                    row_dict.get("Impressions", "0").strip() or 0
                                ),
                                "clicks": int(row_dict.get("Clicks", "0").strip() or 0),
                                # USD; DataNormalizer does not convert
                                "spend": float(row_dict.get("Spend", "0").strip() or 0),
                                "conversions": int(
                                    row_dict.get("Conversions", "0").strip() or 0
                                ),
                                "conversion_value": float(
                                    row_dict.get("ConversionValue", "0").strip() or 0
                                ),
                                "platform": "microsoft",
                            }
                        )

        logger.info(
            f"Microsoft Ads fetch: {len(rows)} campaign/ad-group-day rows "
            f"({date_from} → {date_to})"
        )
        return rows

    except Exception as e:
        logger.error(f"Microsoft Ads fetch failed: {e}")
        return []
