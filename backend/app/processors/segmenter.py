import logging
import re
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Map location codes to IDs (would come from database in production)
LOCATION_CODE_MAP = {
    "SAW": 1,
    "KLIA": 2,
    "KUL": 2,  # Alias for KLIA
    "RIX": 3,
}


class CampaignSegmenter:
    """Extract location and other metadata from campaign/ad group names."""

    @staticmethod
    def extract_location_code(campaign_name: str) -> Optional[str]:
        """Extract location code from campaign name.

        Handles patterns like:
          'SAW - Search Global'  (prefix with dash)
          'Website Trafik_SAW'   (suffix with underscore)
          '(SAW) Retargeting'    (parentheses)
          'SAW ve Çevresi'       (prefix word boundary)
        """
        upper = campaign_name.upper()

        for code in LOCATION_CODE_MAP.keys():
            # Word-boundary match anywhere in the name
            if re.search(r"(?<![A-Z])" + re.escape(code) + r"(?![A-Z])", upper):
                return code

        logger.warning(f"Could not extract location from campaign name: {campaign_name}")
        return None

    @staticmethod
    def get_location_id(campaign_name: str) -> Optional[int]:
        """Get location ID from campaign name."""
        code = CampaignSegmenter.extract_location_code(campaign_name)
        if code:
            return LOCATION_CODE_MAP.get(code)
        return None

    @staticmethod
    def segment_record(record: Dict[str, Any]) -> Dict[str, Any]:
        """Add location_id to a record based on campaign or ad group name."""
        # Try campaign name first, then fall back to ad group name
        code = CampaignSegmenter.extract_location_code(record.get("campaign_name", ""))
        if not code:
            code = CampaignSegmenter.extract_location_code(record.get("ad_group_name", ""))
        location_id = LOCATION_CODE_MAP.get(code) if code else None
        return {
            **record,
            "location_id": location_id,
            "location_code": code,
        }

    @staticmethod
    def segment_records(records: list) -> list:
        """Segment multiple records."""
        segmented = []
        for record in records:
            segmented.append(CampaignSegmenter.segment_record(record))

        # Log summary
        location_counts = {}
        for record in segmented:
            code = record.get("location_code")
            if code:
                location_counts[code] = location_counts.get(code, 0) + 1
            else:
                location_counts["UNKNOWN"] = location_counts.get("UNKNOWN", 0) + 1

        logger.info(f"Segmented {len(segmented)} records by location: {location_counts}")
        return segmented
