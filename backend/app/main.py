import logging
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from .database import init_db
from .api.v1 import router as api_v1_router
from .jobs.fetch_all_platforms import run_hourly_sync

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Europe/Istanbul")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app startup and shutdown."""
    # Startup
    logger.info("Starting Kepler PPC Dashboard...")
    try:
        init_db()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")

    # Hourly platform sync at :00, plus one run 2 minutes after boot so a
    # fresh deploy doesn't wait up to an hour for its first data.
    scheduler.add_job(run_hourly_sync, "cron", minute=0, id="hourly_sync")
    scheduler.add_job(
        run_hourly_sync,
        "date",
        run_date=datetime.now(ZoneInfo("Europe/Istanbul")) + timedelta(minutes=2),
        id="startup_sync",
    )
    scheduler.start()
    logger.info("Scheduler started: hourly sync at :00 (Europe/Istanbul) + startup sync in 2 min")

    yield

    # Shutdown
    logger.info("Shutting down Kepler PPC Dashboard...")
    scheduler.shutdown(wait=False)


# Create FastAPI app
app = FastAPI(
    title="Kepler Club PPC Dashboard API",
    description="Real-time dashboard for Google Ads, Meta Ads, and Yandex Ads metrics",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware for Hostinger frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://dashboard.keplerclub.com",  # Hostinger frontend
        "https://keplerclub.com",
        "https://www.keplerclub.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_v1_router)


@app.get("/health")
def health():
    """Health check, including which credentials are still missing."""
    from .config import settings

    missing_google = settings.missing_google_ads_credentials()
    missing_smtp = settings.missing_smtp_credentials()

    return {
        "status": "ok",
        "google_ads_configured": not missing_google,
        "email_alerts_configured": not missing_smtp,
        "missing_env_vars": missing_google + missing_smtp,
    }


# Serve the built React dashboard (copied to ./static in the Docker image).
# Mounted last so /api/* and /health routes keep precedence.
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="dashboard")
    logger.info(f"Serving dashboard UI from {_static_dir}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
