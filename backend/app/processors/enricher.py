import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class DataEnricher:
    """Calculate KPI metrics (CTR, CPC, CPA, ROAS) from normalized data."""

    @staticmethod
    def enrich_record(record: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate all KPIs for a single record."""
        impressions = record.get("impressions", 0)
        clicks = record.get("clicks", 0)
        conversions = record.get("conversions", 0)
        spend_eur = record.get("spend_eur", 0)
        conversion_value_eur = record.get("conversion_value_eur", 0)

        # Calculate CTR (Click-Through Rate) = clicks / impressions * 100
        ctr = (clicks / impressions * 100) if impressions > 0 else None

        # Calculate CPC (Cost Per Click) = spend / clicks
        cpc_eur = (spend_eur / clicks) if clicks > 0 else None

        # Calculate CPA (Cost Per Acquisition) = spend / conversions
        cpa_eur = (spend_eur / conversions) if conversions > 0 else None

        # Calculate ROAS (Return on Ad Spend) = conversion_value / spend
        roas = (conversion_value_eur / spend_eur) if spend_eur > 0 else None

        enriched = {
            **record,
            "ctr": round(ctr, 2) if ctr is not None else None,
            "cpc_eur": round(cpc_eur, 2) if cpc_eur is not None else None,
            "cpa_eur": round(cpa_eur, 2) if cpa_eur is not None else None,
            "roas": round(roas, 2) if roas is not None else None,
        }

        return enriched

    @staticmethod
    def enrich_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich multiple records with KPI calculations."""
        enriched = []
        for record in records:
            enriched.append(DataEnricher.enrich_record(record))

        logger.info(f"Enriched {len(enriched)} records with KPIs")
        return enriched

    @staticmethod
    def enrich_aggregated(aggregated: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich aggregated metrics (e.g., daily total, by location)."""
        impressions = aggregated.get("impressions", 0)
        clicks = aggregated.get("clicks", 0)
        conversions = aggregated.get("conversions", 0)
        spend_eur = aggregated.get("spend_eur", 0)
        conversion_value_eur = aggregated.get("conversion_value_eur", 0)

        ctr = (clicks / impressions * 100) if impressions > 0 else None
        cpc_eur = (spend_eur / clicks) if clicks > 0 else None
        cpa_eur = (spend_eur / conversions) if conversions > 0 else None
        roas = (conversion_value_eur / spend_eur) if spend_eur > 0 else None

        return {
            **aggregated,
            "ctr": round(ctr, 2) if ctr is not None else None,
            "cpc_eur": round(cpc_eur, 2) if cpc_eur is not None else None,
            "cpa_eur": round(cpa_eur, 2) if cpa_eur is not None else None,
            "roas": round(roas, 2) if roas is not None else None,
        }
