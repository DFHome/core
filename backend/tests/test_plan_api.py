"""Plan layout API: save syncs rooms and device assignments."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.models import Device, PlanLayout, PlanRoom
from app.core.runtime import registry
from app.core.user_rooms import create_user_room
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_save_plan_removes_core_rooms_and_unassigns_devices(client):
    room = await create_user_room(registry, "Кабинет")
    registry.register_device(
        "demo",
        Device(
            id="demo:lamp",
            integration="demo",
            name="Лампа",
            type="light",
            room_id=room.id,
            entities=[],
        ),
    )

    layout = PlanLayout(
        rooms=[PlanRoom(room_id=room.id, x=0, y=0, width=100, height=80)],
        devices=[],
    )
    response = await client.put("/plan", json=layout.model_dump(by_alias=True))
    assert response.status_code == 200

    empty_layout = PlanLayout(rooms=[], devices=[])
    response = await client.put(
        "/plan", json=empty_layout.model_dump(by_alias=True)
    )
    assert response.status_code == 200

    listed = await client.get("/rooms")
    assert all(item["id"] != room.id for item in listed.json())

    devices = await client.get("/devices")
    lamp = next(item for item in devices.json() if item["id"] == "demo:lamp")
    assert lamp["roomId"] is None
