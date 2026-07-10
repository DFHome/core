"""User-defined rooms owned by the core (not integrations).

Persisted in SQLite and mirrored in the in-memory registry under domain ``core``.
"""
import uuid

from app.core import storage
from app.core.models import PlanLayout, Room
from app.core.registry import DeviceRegistry

CORE_DOMAIN = "core"
NAME_MIN_LEN = 1
NAME_MAX_LEN = 64


def is_user_room(room_id: str) -> bool:
    return room_id.startswith(f"{CORE_DOMAIN}:")


def _validate_name(name: str) -> str:
    trimmed = name.strip()
    if not (NAME_MIN_LEN <= len(trimmed) <= NAME_MAX_LEN):
        raise ValueError(
            f"Room name must be {NAME_MIN_LEN}–{NAME_MAX_LEN} characters"
        )
    return trimmed


def _row_to_room(row: dict) -> Room:
    return Room(id=row["id"], name=row["name"], icon=row.get("icon"))


async def load_user_rooms(registry: DeviceRegistry) -> None:
    for row in await storage.list_user_rooms():
        registry.register_room(CORE_DOMAIN, _row_to_room(row))


async def create_user_room(
    registry: DeviceRegistry, name: str, icon: str | None = None
) -> Room:
    validated = _validate_name(name)
    room_id = f"{CORE_DOMAIN}:{uuid.uuid4()}"
    row = await storage.insert_user_room(room_id, validated, icon)
    room = _row_to_room(row)
    registry.register_room(CORE_DOMAIN, room)
    return room


async def update_user_room(
    registry: DeviceRegistry, room_id: str, name: str, icon: str | None = None
) -> Room:
    if not is_user_room(room_id):
        raise PermissionError("Only core-owned rooms can be updated")
    validated = _validate_name(name)
    row = await storage.update_user_room(room_id, validated, icon)
    if row is None:
        raise LookupError(f"Room '{room_id}' not found")
    room = _row_to_room(row)
    registry.register_room(CORE_DOMAIN, room)
    return room


async def scrub_room_from_plan(room_id: str) -> None:
    raw_plan = await storage.kv_get("plan_layout")
    if not raw_plan:
        return
    layout = PlanLayout.model_validate(raw_plan)
    layout.rooms = [room for room in layout.rooms if room.room_id != room_id]
    for device in layout.devices:
        if device.attached_room_id == room_id:
            device.attached_room_id = None
            device.visual_kind = "bulb"
    await storage.kv_set(
        "plan_layout", layout.model_dump(by_alias=True, exclude_none=True)
    )


async def delete_user_room(
    registry: DeviceRegistry, room_id: str, *, scrub_plan: bool = True
) -> None:
    if not is_user_room(room_id):
        raise PermissionError("Only core-owned rooms can be deleted")
    deleted = await storage.delete_user_room(room_id)
    if not deleted:
        raise LookupError(f"Room '{room_id}' not found")
    registry.unregister_room(CORE_DOMAIN, room_id)
    if scrub_plan:
        await scrub_room_from_plan(room_id)
