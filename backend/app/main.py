import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .api.v1 import router as api_v1_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


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

    yield

    # Shutdown
    logger.info("Shutting down Kepler PPC Dashboard...")


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


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Kepler Club PPC Dashboard API",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    """Health check."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
