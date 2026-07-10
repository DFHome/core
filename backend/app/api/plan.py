"""Floor-plan layout API.

GET returns the user-saved layout; if none, it falls back to the suggested
layout aggregated from installed integrations (so the plan looks populated out
of the box once an integration like demo is installed).
"""
import contextlib

from fastapi import APIRouter

from app.core import storage
from app.core.models import PlanLayout
from app.core.runtime import registry
from app.core.user_rooms import delete_user_room, is_user_room

router = APIRouter(prefix="/plan", tags=["plan"])


async def _sync_rooms_with_plan(payload: PlanLayout) -> None:
    """Rooms exist only while they are on the plan; detach devices from removed rooms."""
    plan_room_ids = {room.room_id for room in payload.rooms}
    known_room_ids = {room.id for room in registry.all_rooms()}
    removed_room_ids = known_room_ids - plan_room_ids

    for room_id in removed_room_ids:
        await registry.clear_devices_room_assignment(room_id)

    for room_id in removed_room_ids:
        if is_user_room(room_id):
            with contextlib.suppress(LookupError):
                await delete_user_room(registry, room_id, scrub_plan=False)


@router.get("", response_model=PlanLayout)
async def get_plan() -> PlanLayout:
    raw = await storage.kv_get("plan_layout")
    if raw:
        return PlanLayout.model_validate(raw)
    return registry.suggested_plan()


@router.put("", response_model=PlanLayout)
async def save_plan(payload: PlanLayout) -> PlanLayout:
    await _sync_rooms_with_plan(payload)
    await storage.kv_set(
        "plan_layout", payload.model_dump(by_alias=True, exclude_none=True)
    )
    return payload


@router.delete("", response_model=PlanLayout)
async def reset_plan() -> PlanLayout:
    """Drop the user-saved layout and return the suggested one from integrations."""
    await storage.kv_delete("plan_layout")
    return registry.suggested_plan()
