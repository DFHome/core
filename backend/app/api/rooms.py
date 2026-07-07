"""Rooms API: integration-contributed and core-owned user rooms."""
from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.core.models import CamelModel, Room
from app.core.runtime import registry
from app.core.user_rooms import (
    create_user_room,
    delete_user_room,
    is_user_room,
    update_user_room,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


class RoomCreate(CamelModel):
    name: str
    icon: str | None = None


class RoomUpdate(CamelModel):
    name: str = Field(min_length=1, max_length=64)
    icon: str | None = None


@router.get("", response_model=list[Room])
async def list_rooms() -> list[Room]:
    return registry.all_rooms()


@router.post("", response_model=Room, status_code=201)
async def create_room(payload: RoomCreate) -> Room:
    try:
        return await create_user_room(registry, payload.name, payload.icon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch("/{room_id}", response_model=Room)
async def patch_room(room_id: str, payload: RoomUpdate) -> Room:
    if not is_user_room(room_id):
        raise HTTPException(status_code=403, detail="Integration rooms cannot be edited")
    try:
        return await update_user_room(registry, room_id, payload.name, payload.icon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{room_id}", status_code=204)
async def remove_room(room_id: str) -> None:
    if not is_user_room(room_id):
        raise HTTPException(status_code=403, detail="Integration rooms cannot be deleted")
    try:
        await delete_user_room(registry, room_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
