from sqlalchemy import Column, Integer, String, DateTime, func
from ..database import Base


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # 'google', 'meta', 'yandex'
    created_at = Column(DateTime, default=func.now())

    def __repr__(self):
        return f"<Platform(id={self.id}, name={self.name})>"
