from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime


class HourlyMetricsSnapshot(Base):
    __tablename__ = "hourly_metrics_snapshot"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    platform_id = Column(Integer, ForeignKey("platforms.id"), nullable=False)

    # Snapshot hour (e.g., 2026-06-10 14:00:00)
    metric_hour = Column(DateTime, nullable=False)

    # Cumulative "today" stats (resets daily at UTC+3)
    impressions_today = Column(Integer, default=0)
    clicks_today = Column(Integer, default=0)
    conversions_today = Column(Integer, default=0)
    spend_today_eur = Column(Float, default=0.0)
    conversion_value_today_eur = Column(Float, default=0.0)

    # Snapshot created/updated time
    created_at = Column(DateTime, default=lambda: datetime.utcnow())

    # Unique constraint: one snapshot per hour per campaign
    __table_args__ = (
        UniqueConstraint("campaign_id", "metric_hour", name="uq_campaign_hour"),
    )

    def __repr__(self):
        return f"<HourlyMetricsSnapshot(hour={self.metric_hour}, spend={self.spend_today_eur})>"
