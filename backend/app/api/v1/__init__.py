from fastapi import APIRouter

from .dashboard import router as dashboard_router
from .dashboard_full import router as dashboard_full_router

router = APIRouter()
router.include_router(dashboard_router)
router.include_router(dashboard_full_router)

__all__ = ["router"]
