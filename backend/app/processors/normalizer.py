import logging
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class DataNormalizer:
    """Normalize metrics from different platforms into unified format."""

    PLATFORM_FIELD_MAPPING = {
        "google": {
            "impressions": "impressions",
            "clicks": "clicks",
            "spend": "spend_eur",
            "conversions": "conversions",
            "conversion_value": "conversion_value_eur",
        },
        "meta": {
            "impressions": "impressions",
            "clicks": "clicks",
            "spend": "spend",  # Will convert from USD to EUR
            "conversions": "conversions",
            "conversion_value": "conversion_value",  # Will convert from USD to EUR
        },
        "yandex": {
            "impressions": "impressions",
            "clicks": "clicks",
            "spend": "cost",  # In RUB, will convert to EUR
            "conversions": "conversions",
            "conversion_value": None,  # Yandex doesn't provide this
        },
    }

    def __init__(self):
        self.usd_to_eur = 1.1  # Current approximate rate (configurable)
        # Yandex reports spend in RUB; convert to TRY for display.
        # Override via YANDEX_RUB_TO_TRY env var when the rate drifts.
        self.rub_to_try = float(os.getenv("YANDEX_RUB_TO_TRY", "0.37"))

    def validate_record(self, record: Dict[str, Any], platform: str) -> bool:
        """Validate that required fields are present."""
        required_fields = ["campaign_id", "campaign_name", "ad_group_id", "ad_group_name", "metric_date"]
        for field in required_fields:
            if field not in record or record[field] is None:
                logger.warning(f"Missing required field {field} in {platform} record: {record}")
                return False
        return True

    def normalize_metrics(self, records: List[Dict[str, Any]], platform: str) -> List[Dict[str, Any]]:
        """Normalize metrics from a platform into standard format."""
        normalized = []

        for record in records:
            if not self.validate_record(record, platform):
                continue

            normalized_record = {
                "campaign_id": record.get("campaign_id"),
                "campaign_name": record.get("campaign_name"),
                "ad_group_id": record.get("ad_group_id"),
                "ad_group_name": record.get("ad_group_name"),
                "metric_date": record.get("metric_date"),
                "platform": platform,
                "impressions": int(record.get("impressions", 0)),
                "clicks": int(record.get("clicks", 0)),
                "conversions": int(record.get("conversions", 0)),
                "spend_eur": self._convert_spend_to_eur(record, platform),
                "conversion_value_eur": self._convert_conversion_value_to_eur(record, platform),
            }

            # Validate positive numbers
            if normalized_record["spend_eur"] < 0 or normalized_record["conversion_value_eur"] < 0:
                logger.warning(f"Negative spend/value in record: {normalized_record}")
                continue

            normalized.append(normalized_record)

        logger.info(f"Normalized {len(normalized)} records from {platform}")
        return normalized

    def _convert_spend_to_eur(self, record: Dict[str, Any], platform: str) -> float:
        """Convert spend to the dashboard's display currency (TRY for this account)."""
        spend = float(record.get("spend_eur") or record.get("spend") or 0)

        if platform == "google":
            return spend  # Google account is TRY — pass through
        elif platform == "meta":
            currency = record.get("account_currency", "USD").upper()
            if currency == "TRY":
                return spend  # Meta account is also TRY — pass through
            elif currency == "EUR":
                return spend
            else:
                return spend * self.usd_to_eur  # USD → EUR fallback
        elif platform == "yandex":
            return spend * self.rub_to_try  # RUB → TRY
        else:
            return spend

    def _convert_conversion_value_to_eur(self, record: Dict[str, Any], platform: str) -> float:
        """Convert conversion value to the dashboard's display currency."""
        value = float(record.get("conversion_value_eur") or record.get("conversion_value") or 0)

        if platform == "google":
            return value  # Already in TRY
        elif platform == "meta":
            currency = record.get("account_currency", "USD").upper()
            if currency == "TRY":
                return value
            elif currency == "EUR":
                return value
            else:
                return value * self.usd_to_eur
        elif platform == "yandex":
            return 0.0  # Yandex doesn't provide conversion value
        else:
            return value
