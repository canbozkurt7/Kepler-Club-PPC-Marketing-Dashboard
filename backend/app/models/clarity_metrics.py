from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class ClarityFrictionMetrics(Base):
    __tablename__ = "clarity_friction_metrics"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    friction_date = Column(Date, nullable=False)
    page_url = Column(String(500), nullable=False)

    # Friction metrics from Clarity
    dead_clicks = Column(Integer, default=0)
    rage_clicks = Column(Integer, default=0)
    bounce_rate = Column(Float, nullable=True)  # percentage
    avg_load_time_ms = Column(Float, nullable=True)
    performance_score = Column(Float, nullable=True)  # 0-100
    sessions = Column(Integer, default=0)
    users = Column(Integer, default=0)

    synced_at = Column(DateTime, default=func.now())

    # Relationships
    location = relationship("Location", foreign_keys=[location_id])

    def __repr__(self):
        return f"<ClarityFrictionMetrics(location_id={self.location_id}, date={self.friction_date})>"
