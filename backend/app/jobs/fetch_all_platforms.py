import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..fetchers.google_ads import GoogleAdsClientWrapper
from ..processors.normalizer import DataNormalizer
from ..processors.enricher import DataEnricher
from ..processors.segmenter import CampaignSegmenter
from ..models import DailyMetrics, Platform, Location, Campaign, AdGroup, SyncLog
from ..config import settings

logger = logging.getLogger(__name__)


class PlatformSyncer:
    """Synchronize data from all platforms into the database."""

    def __init__(self, db: Session):
        self.db = db
        self.normalizer = DataNormalizer()
        self.enricher = DataEnricher()

    def sync_google_ads(self, customer_id: str) -> bool:
        """Fetch and store Google Ads data."""
        sync_log = SyncLog(
            platform_id=1,  # google
            sync_type="google_ads",
            sync_status="RUNNING",
            started_at=datetime.utcnow(),
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            client = GoogleAdsClientWrapper()
            if not client.authenticate():
                raise Exception("Failed to authenticate with Google Ads")

            # Fetch yesterday's data
            raw_data = client.fetch_yesterday_metrics(customer_id)

            # Normalize
            normalized = self.normalizer.normalize_metrics(raw_data, "google")

            # Enrich with KPIs
            enriched = self.enricher.enrich_records(normalized)

            # Segment by location
            segmented = CampaignSegmenter.segment_records(enriched)

            # Store in database
            records_stored = self._store_metrics(segmented, "google")

            sync_log.sync_status = "SUCCESS"
            sync_log.records_processed = records_stored
            sync_log.completed_at = datetime.utcnow()
            sync_log.sync_duration_sec = (
                sync_log.completed_at - sync_log.started_at
            ).total_seconds()

            logger.info(f"Google Ads sync completed: {records_stored} records")
            return True

        except Exception as e:
            sync_log.sync_status = "FAILED"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            logger.error(f"Google Ads sync failed: {str(e)}")
            return False

        finally:
            self.db.commit()

    def _store_metrics(self, records: list, platform_name: str) -> int:
        """Store metrics in database, handling duplicates."""
        platform = self.db.query(Platform).filter(Platform.name == platform_name).first()
        if not platform:
            platform = Platform(name=platform_name)
            self.db.add(platform)
            self.db.flush()

        stored_count = 0

        for record in records:
            try:
                location_id = record.get("location_id")
                if not location_id:
                    logger.warning(
                        f"Skipping record with no location: {record.get('campaign_name')}"
                    )
                    continue

                # Get or create campaign
                campaign = (
                    self.db.query(Campaign)
                    .filter(
                        Campaign.platform_id == platform.id,
                        Campaign.platform_campaign_id == record.get("campaign_id"),
                    )
                    .first()
                )

                if not campaign:
                    campaign = Campaign(
                        platform_id=platform.id,
                        platform_campaign_id=record.get("campaign_id"),
                        location_id=location_id,
                        name=record.get("campaign_name"),
                        status="ACTIVE",
                    )
                    self.db.add(campaign)
                    self.db.flush()

                # Get or create ad group
                ad_group = (
                    self.db.query(AdGroup)
                    .filter(
                        AdGroup.campaign_id == campaign.id,
                        AdGroup.platform_ad_group_id == record.get("ad_group_id"),
                    )
                    .first()
                )

                if not ad_group:
                    ad_group = AdGroup(
                        campaign_id=campaign.id,
                        platform_ad_group_id=record.get("ad_group_id"),
                        name=record.get("ad_group_name"),
                        status="ACTIVE",
                    )
                    self.db.add(ad_group)
                    self.db.flush()

                # Create or update daily metrics
                metric_date = record.get("metric_date")
                if isinstance(metric_date, str):
                    metric_date = datetime.strptime(metric_date, "%Y-%m-%d").date()

                daily_metric = (
                    self.db.query(DailyMetrics)
                    .filter(
                        DailyMetrics.ad_group_id == ad_group.id,
                        DailyMetrics.metric_date == metric_date,
                        DailyMetrics.platform_id == platform.id,
                    )
                    .first()
                )

                if daily_metric:
                    # Update existing
                    daily_metric.impressions = record.get("impressions", 0)
                    daily_metric.clicks = record.get("clicks", 0)
                    daily_metric.conversions = record.get("conversions", 0)
                    daily_metric.spend_eur = record.get("spend_eur", 0)
                    daily_metric.conversion_value_eur = record.get(
                        "conversion_value_eur", 0
                    )
                    daily_metric.ctr = record.get("ctr")
                    daily_metric.cpc_eur = record.get("cpc_eur")
                    daily_metric.cpa_eur = record.get("cpa_eur")
                    daily_metric.roas = record.get("roas")
                else:
                    # Create new
                    daily_metric = DailyMetrics(
                        ad_group_id=ad_group.id,
                        campaign_id=campaign.id,
                        location_id=location_id,
                        platform_id=platform.id,
                        metric_date=metric_date,
                        impressions=record.get("impressions", 0),
                        clicks=record.get("clicks", 0),
                        conversions=record.get("conversions", 0),
                        spend_eur=record.get("spend_eur", 0),
                        conversion_value_eur=record.get("conversion_value_eur", 0),
                        ctr=record.get("ctr"),
                        cpc_eur=record.get("cpc_eur"),
                        cpa_eur=record.get("cpa_eur"),
                        roas=record.get("roas"),
                        sync_source=platform_name,
                    )
                    self.db.add(daily_metric)

                stored_count += 1

            except Exception as e:
                logger.error(f"Failed to store metric record: {str(e)}")
                continue

        self.db.commit()
        return stored_count


def run_hourly_sync():
    """Run hourly synchronization of all platforms."""
    db = SessionLocal()
    logger.info("Starting hourly platform sync...")

    try:
        missing = settings.missing_google_ads_credentials()
        if missing:
            logger.warning(f"Skipping Google Ads sync — missing env vars: {missing}")
            return

        syncer = PlatformSyncer(db)
        syncer.sync_google_ads(settings.google_ads_customer_id)

        # TODO: Add Meta Ads sync (Phase 2)
        # TODO: Add Yandex Ads sync (Phase 2)

        logger.info("Hourly sync completed")

    except Exception as e:
        logger.error(f"Hourly sync failed: {str(e)}")

    finally:
        db.close()


if __name__ == "__main__":
    run_hourly_sync()
