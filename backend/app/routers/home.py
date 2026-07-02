from fastapi import APIRouter

from app.models import HomeView, RoomView, ScenarioSummary
from app.yandex.normalize import normalize_device
from app.yandex.official import OfficialClient

router = APIRouter(prefix="/home", tags=["home"])


@router.get("", response_model=HomeView)
async def get_home() -> HomeView:
    client = await OfficialClient.from_storage()
    data = await client.get_user_info()

    room_by_id: dict[str, dict] = {r["id"]: r for r in data.get("rooms", [])}
    rooms: dict[str, RoomView] = {
        room_id: RoomView(id=room_id, name=room["name"])
        for room_id, room in room_by_id.items()
    }
    unassigned: list = []

    for raw_device in data.get("devices", []):
        room_id = raw_device.get("room")
        room_name = room_by_id.get(room_id, {}).get("name") if room_id else None
        device = normalize_device(raw_device, room_name=room_name)
        if room_id and room_id in rooms:
            rooms[room_id].devices.append(device)
        else:
            unassigned.append(device)

    scenarios = [
        ScenarioSummary(id=s["id"], name=s.get("name", s["id"]), icon=s.get("icon"))
        for s in data.get("scenarios", [])
    ]

    return HomeView(
        rooms=list(rooms.values()),
        unassigned_devices=unassigned,
        scenarios=scenarios,
    )
