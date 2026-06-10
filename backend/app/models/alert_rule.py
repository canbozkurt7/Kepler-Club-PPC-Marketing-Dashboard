from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)  # NULL = all locations
    alert_type = Column(String(100), nullable=False)  # 'roas_drop', 'cpa_spike', 'zero_conversions', etc.
    metric_name = Column(String(50), nullable=False)  # 'roas', 'cpa', 'ctr', 'conversions', etc.
    operator = Column(String(10), nullable=False)  # '<', '>', '==', etc.
    threshold = Column(Float, nullable=False)  # e.g., 1.5 for ROAS < 1.5
    severity = Column(String(20), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW
    enabled = Column(Boolean, default=True)
    notify_channels = Column(String(255))  # 'email', 'slack', 'email,dashboard', etc.
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    location = relationship("Location", foreign_keys=[location_id])
    alert_history = relationship("AlertHistory", back_populates="rule", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AlertRule(id={self.id}, alert_type={self.alert_type}, severity={self.severity})>"
