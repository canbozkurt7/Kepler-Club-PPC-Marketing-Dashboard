from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from decimal import Decimal
from ..database import Base


class DailyMetrics(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    ad_group_id = Column(Integer, ForeignKey("ad_groups.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    platform_id = Column(Integer, ForeignKey("platforms.id"), nullable=False)

    # Date
    metric_date = Column(Date, nullable=False)

    # Raw metrics
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    spend_eur = Column(Float, default=0.0)
    conversion_value_eur = Column(Float, default=0.0)

    # Calculated metrics (in EUR)
    ctr = Column(Float, nullable=True)  # clicks / impressions * 100
    cpc_eur = Column(Float, nullable=True)  # spend / clicks
    cpa_eur = Column(Float, nullable=True)  # spend / conversions
    roas = Column(Float, nullable=True)  # conversion_value / spend

    sync_source = Column(String(50))  # 'google', 'meta', 'yandex'
    synced_at = Column(DateTime, default=func.now())

    # Relationships
    ad_group = relationship("AdGroup", back_populates="metrics", foreign_keys=[ad_group_id])

    # Unique constraint to prevent duplicates
    __table_args__ = (
        UniqueConstraint("ad_group_id", "metric_date", "platform_id", name="uq_ad_group_date_platform"),
    )

    def calculate_kpis(self):
        """Calculate CTR, CPC, CPA, ROAS."""
        if self.impressions > 0:
            self.ctr = (self.clicks / self.impressions) * 100

        if self.clicks > 0:
            self.cpc_eur = self.spend_eur / self.clicks

        if self.conversions > 0:
            self.cpa_eur = self.spend_eur / self.conversions

        if self.spend_eur > 0:
            self.roas = self.conversion_value_eur / self.spend_eur

    def __repr__(self):
        return f"<DailyMetrics(date={self.metric_date}, spend={self.spend_eur}, roas={self.roas})>"
