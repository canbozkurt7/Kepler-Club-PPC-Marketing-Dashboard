from sqlalchemy import Column, Integer, String, DateTime, func
from ..database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # 'SAW', 'KLIA', 'RIX'
    name = Column(String(100), nullable=False)  # 'Istanbul', 'Kuala Lumpur', 'Riga'
    timezone = Column(String(50), default="UTC+3")
    created_at = Column(DateTime, default=func.now())

    def __repr__(self):
        return f"<Location(id={self.id}, code={self.code}, name={self.name})>"
