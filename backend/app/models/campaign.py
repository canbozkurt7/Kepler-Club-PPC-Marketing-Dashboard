from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"), nullable=False)
    platform_campaign_id = Column(String(100), nullable=False)  # External API ID
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, PAUSED, REMOVED
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    platform = relationship("Platform", foreign_keys=[platform_id])
    location = relationship("Location", foreign_keys=[location_id])
    ad_groups = relationship("AdGroup", back_populates="campaign", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Campaign(id={self.id}, name={self.name}, platform_id={self.platform_id})>"
