from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
from .config import settings

# Base class for all models
Base = declarative_base()

# Synchronous engine (for initial setup, Alembic)
sync_engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    echo=settings.debug,
)

# Session factory for sync operations
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine,
)


def get_db():
    """Dependency for FastAPI routes (sync)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=sync_engine)


if __name__ == "__main__":
    init_db()
    print("Database tables created!")
