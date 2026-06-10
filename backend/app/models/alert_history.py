from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("alert_rules.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    triggered_at = Column(DateTime, default=func.now())
    metric_value = Column(Float, nullable=False)  # The actual value that triggered the alert
    alert_status = Column(String(50), default="TRIGGERED")  # TRIGGERED, ACKNOWLEDGED, RESOLVED
    acknowledged_by = Column(String(255), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    email_sent = Column(String(255), nullable=True)  # Recipient email if sent
    email_sent_at = Column(DateTime, nullable=True)

    # Relationships
    rule = relationship("AlertRule", back_populates="alert_history", foreign_keys=[rule_id])

    def __repr__(self):
        return f"<AlertHistory(rule_id={self.rule_id}, triggered_at={self.triggered_at}, status={self.alert_status})>"
