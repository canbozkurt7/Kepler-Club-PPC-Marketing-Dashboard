import logging
import os
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..fetchers.google_ads import GoogleAdsClientWrapper
from ..fetchers.clarity import fetch_clarity_metrics
from ..fetchers.meta_ads import fetch_meta_metrics
from ..processors.normalizer import DataNormalizer
from ..processors.enricher import DataEnricher
from ..processors.segmenter import CampaignSegmenter
from ..models import DailyMetrics, Platform, Location, Campaign, AdGroup, SyncLog, ClarityFrictionMetrics
from ..config import settings

logger = logging.getLogger(__name__)


class PlatformSyncer:
    """Synchronize data from all platforms into the database."""

    def __init__(self, db: Session):
        self.db = db
        self.normalizer = DataNormalizer()
        self.enricher = DataEnricher()

    def sync_google_ads(self, customer_id: str, days: int = 1) -> bool:
        """Fetch and store Google Ads data for the last `days` days."""
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

            # Regular runs fetch yesterday + today (intraday freshness);
            # backfills fetch a longer window
            if days <= 1:
                raw_data = client.fetch_recent_metrics(customer_id)
            else:
                raw_data = client.fetch_last_n_days(customer_id, days=days)

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

                # Platform APIs return numeric IDs; columns are VARCHAR
                campaign_ext_id = str(record.get("campaign_id"))
                ad_group_ext_id = str(record.get("ad_group_id"))

                # Get or create campaign
                campaign = (
                    self.db.query(Campaign)
                    .filter(
                        Campaign.platform_id == platform.id,
                        Campaign.platform_campaign_id == campaign_ext_id,
                    )
                    .first()
                )

                if not campaign:
                    campaign = Campaign(
                        platform_id=platform.id,
                        platform_campaign_id=campaign_ext_id,
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
                        AdGroup.platform_ad_group_id == ad_group_ext_id,
                    )
                    .first()
                )

                if not ad_group:
                    ad_group = AdGroup(
                        campaign_id=campaign.id,
                        platform_ad_group_id=ad_group_ext_id,
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
                # Reset the poisoned transaction so later records can still store
                self.db.rollback()
                continue

        self.db.commit()
        return stored_count

    def sync_meta_ads(self, days: int = 1) -> bool:
        """Fetch and store Meta Ads data."""
        if not os.getenv("META_ACCESS_TOKEN") or not os.getenv("META_AD_ACCOUNT_ID"):
            logger.warning("Skipping Meta Ads sync — META_ACCESS_TOKEN or META_AD_ACCOUNT_ID not set")
            return False

        sync_log = SyncLog(
            platform_id=2,  # meta
            sync_type="meta_ads",
            sync_status="RUNNING",
            started_at=datetime.utcnow(),
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            if days <= 1:
                date_to = datetime.utcnow().strftime("%Y-%m-%d")
                date_from = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                date_to = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
                date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

            raw_data = fetch_meta_metrics(date_from=date_from, date_to=date_to)
            normalized = self.normalizer.normalize_metrics(raw_data, "meta")
            enriched = self.enricher.enrich_records(normalized)
            segmented = CampaignSegmenter.segment_records(enriched)
            records_stored = self._store_metrics(segmented, "meta")

            sync_log.sync_status = "SUCCESS"
            sync_log.records_processed = records_stored
            sync_log.completed_at = datetime.utcnow()
            sync_log.sync_duration_sec = (
                sync_log.completed_at - sync_log.started_at
            ).total_seconds()

            logger.info(f"Meta Ads sync completed: {records_stored} records")
            return True

        except Exception as e:
            sync_log.sync_status = "FAILED"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            logger.error(f"Meta Ads sync failed: {str(e)}")
            return False

        finally:
            self.db.commit()

    def sync_clarity(self, days: int = 1) -> bool:
        """Fetch site-wide Clarity friction metrics and upsert today's row.

        One row per (friction_date, page_url='site-wide') — Clarity data is
        not per-location, so duplicating it across locations would inflate
        the dashboard sums.
        """
        sync_log = SyncLog(
            platform_id=None,  # Clarity is not an ad platform
            sync_type="clarity_friction",
            sync_status="RUNNING",
            started_at=datetime.utcnow(),
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            # Clarity rows need a location FK; use the first location as the
            # canonical owner of site-wide rows.
            anchor = self.db.query(Location).order_by(Location.id).first()
            if not anchor:
                logger.warning("No locations found in database")
                return False

            clarity_data = fetch_clarity_metrics(days=days)
            metrics = clarity_data.get("metrics", {}).get("site-wide")
            if "error" in clarity_data or not metrics:
                logger.warning(
                    f"Clarity sync skipped: {clarity_data.get('error', 'no data')}"
                )
                sync_log.sync_status = "FAILED"
                sync_log.error_message = clarity_data.get("error", "no data")
                sync_log.completed_at = datetime.utcnow()
                return False

            today = date.today()
            existing = (
                self.db.query(ClarityFrictionMetrics)
                .filter(
                    ClarityFrictionMetrics.friction_date == today,
                    ClarityFrictionMetrics.page_url == "site-wide",
                )
                .first()
            )

            if existing:
                existing.dead_clicks = metrics.get("deadClickCount", 0)
                existing.rage_clicks = metrics.get("rageClickCount", 0)
                if metrics.get("bounceRate"):
                    existing.bounce_rate = metrics["bounceRate"]
                if metrics.get("avgPageLoadMs"):
                    existing.avg_load_time_ms = metrics["avgPageLoadMs"]
                existing.sessions = metrics.get("totalSessions", 0)
                existing.synced_at = datetime.utcnow()
            else:
                self.db.add(
                    ClarityFrictionMetrics(
                        location_id=anchor.id,
                        friction_date=today,
                        page_url="site-wide",
                        dead_clicks=metrics.get("deadClickCount", 0),
                        rage_clicks=metrics.get("rageClickCount", 0),
                        bounce_rate=metrics.get("bounceRate", 0.0),
                        avg_load_time_ms=metrics.get("avgPageLoadMs", 0.0),
                        sessions=metrics.get("totalSessions", 0),
                    )
                )

            self.db.commit()

            sync_log.sync_status = "SUCCESS"
            sync_log.records_processed = 1
            sync_log.completed_at = datetime.utcnow()
            sync_log.sync_duration_sec = (
                sync_log.completed_at - sync_log.started_at
            ).total_seconds()

            logger.info(f"Clarity sync completed: {metrics.get('totalSessions')} sessions today")
            return True

        except Exception as e:
            sync_log.sync_status = "FAILED"
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.utcnow()
            logger.error(f"Clarity sync failed: {str(e)}")
            return False

        finally:
            self.db.commit()


def run_hourly_sync(days: int = 1):
    """Run synchronization of all platforms. days>1 performs a backfill."""
    db = SessionLocal()
    logger.info(f"Starting platform sync (last {days} day(s))...")

    try:
        missing = settings.missing_google_ads_credentials()
        if missing:
            logger.warning(f"Skipping Google Ads sync — missing env vars: {missing}")
            return

        syncer = PlatformSyncer(db)
        syncer.sync_google_ads(settings.google_ads_customer_id, days=days)
        syncer.sync_meta_ads(days=days)

        # Clarity Data Export API allows only 10 requests/day. The sync job
        # now runs every 15 minutes, so gate Clarity to the first run of
        # every 6th hour (00:00, 06:00, 12:00, 18:00) → 4 requests/day.
        now = datetime.now()
        if days > 1 or (now.hour % 6 == 0 and now.minute < 15):
            syncer.sync_clarity(days=days)

        # TODO: Add Meta Ads sync (Phase 2)
        # TODO: Add Yandex Ads sync (Phase 2)

        logger.info("Sync completed")

    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")

    finally:
        db.close()


if __name__ == "__main__":
    import sys

    # Usage: python -m app.jobs.fetch_all_platforms [days]
    # e.g. `... fetch_all_platforms 30` backfills the last 30 days
    n_days = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    run_hourly_sync(days=n_days)
