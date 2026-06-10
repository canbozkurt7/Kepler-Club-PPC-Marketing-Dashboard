from sqlalchemy import Column, Integer, String, DateTime, func, Text
from sqlalchemy.orm import relationship
from ..database import Base


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    platform_id = Column(Integer, nullable=True)  # 1=google, 2=meta, 3=yandex, NULL=clarity
    sync_type = Column(String(50), nullable=False)  # 'google_ads', 'meta_ads', 'yandex_ads', 'clarity'
    sync_status = Column(String(20), default="RUNNING")  # RUNNING, SUCCESS, FAILED
    records_processed = Column(Integer, default=0)
    sync_duration_sec = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<SyncLog(sync_type={self.sync_type}, status={self.sync_status}, started={self.started_at})>"
