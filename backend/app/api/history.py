"""Read access to sensor history sampled by app.core.history."""
from fastapi import APIRouter, Query

from app.core import history

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/{device_id}")
async def get_device_history(
    device_id: str,
    hours: int = Query(3, ge=1, le=48),
) -> dict:
    return await history.get_device_history(device_id, hours)
