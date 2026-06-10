from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class AdGroup(Base):
    __tablename__ = "ad_groups"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    platform_ad_group_id = Column(String(100), nullable=False)  # External API ID
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    campaign = relationship("Campaign", back_populates="ad_groups", foreign_keys=[campaign_id])
    metrics = relationship("DailyMetrics", back_populates="ad_group", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AdGroup(id={self.id}, name={self.name}, campaign_id={self.campaign_id})>"
