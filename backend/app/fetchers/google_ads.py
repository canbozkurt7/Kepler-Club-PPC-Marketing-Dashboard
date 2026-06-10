import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.ads.googleads.client import GoogleAdsClient
from ..config import settings

logger = logging.getLogger(__name__)


class GoogleAdsClientWrapper:
    """Wrapper for Google Ads API with data fetching capabilities."""

    def __init__(self):
        self.developer_token = settings.google_ads_developer_token
        self.client_id = settings.google_ads_client_id
        self.client_secret = settings.google_ads_client_secret
        self.refresh_token = settings.google_ads_refresh_token
        self.client = None

    def authenticate(self) -> bool:
        """Authenticate and refresh Google Ads credentials."""
        try:
            credentials = Credentials(
                token=None,
                refresh_token=self.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=["https://www.googleapis.com/auth/adwords"],
            )

            credentials.refresh(Request())
            self.client = GoogleAdsClient(credentials=credentials, developer_token=self.developer_token)
            logger.info("Google Ads authentication successful")
            return True
        except Exception as e:
            logger.error(f"Google Ads authentication failed: {str(e)}")
            return False

    def fetch_metrics_by_date(
        self, customer_id: str, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch campaign/ad group metrics for a date range.
        Returns list of dicts with normalized structure.
        """
        if not self.client:
            raise RuntimeError("Not authenticated. Call authenticate() first.")

        ga_service = self.client.get_service("GoogleAdsService")

        query = f"""
            SELECT
                campaign.id,
                campaign.name,
                ad_group.id,
                ad_group.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversion_value,
                segments.date
            FROM ad_group
            WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
            ORDER BY segments.date DESC
        """

        metrics_list = []
        try:
            response = ga_service.search_stream(customer_id=customer_id, query=query)

            for batch in response:
                for row in batch.results:
                    metric_date = row.segments.date
                    campaign_id = row.campaign.id
                    campaign_name = row.campaign.name
                    ad_group_id = row.ad_group.id
                    ad_group_name = row.ad_group.name
                    impressions = row.metrics.impressions
                    clicks = row.metrics.clicks
                    cost_eur = row.metrics.cost_micros / 1_000_000  # Convert micros to EUR
                    conversions = int(row.metrics.conversions)
                    conversion_value_eur = row.metrics.conversion_value

                    metrics_list.append(
                        {
                            "campaign_id": campaign_id,
                            "campaign_name": campaign_name,
                            "ad_group_id": ad_group_id,
                            "ad_group_name": ad_group_name,
                            "metric_date": metric_date,
                            "impressions": impressions,
                            "clicks": clicks,
                            "spend_eur": cost_eur,
                            "conversions": conversions,
                            "conversion_value_eur": conversion_value_eur,
                            "platform": "google",
                        }
                    )

            logger.info(f"Fetched {len(metrics_list)} records from Google Ads")
            return metrics_list

        except Exception as e:
            logger.error(f"Error fetching Google Ads metrics: {str(e)}")
            return []

    def fetch_yesterday_metrics(self, customer_id: str) -> List[Dict[str, Any]]:
        """Fetch metrics for yesterday."""
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        return self.fetch_metrics_by_date(customer_id, yesterday, yesterday)

    def fetch_last_n_days(self, customer_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Fetch metrics for the last N days."""
        end_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        return self.fetch_metrics_by_date(customer_id, start_date, end_date)
