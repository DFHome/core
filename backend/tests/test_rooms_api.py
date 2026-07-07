"""User room CRUD and API permissions."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core import storage
from app.core.models import PlanLayout
from app.core.runtime import registry
from app.core.user_rooms import (
    create_user_room,
    delete_user_room,
    is_user_room,
    load_user_rooms,
    update_user_room,
)
from app.main import app


@pytest.fixture(autouse=True)
def reset_registry_rooms():
    registry._rooms.clear()
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_create_list_update_delete_user_room(core):
    reg, _, _ = core

    created = await create_user_room(reg, "Гостиная")
    assert is_user_room(created.id)
    assert created.name == "Гостиная"

    listed = await storage.list_user_rooms()
    assert len(listed) == 1
    assert listed[0]["id"] == created.id

    updated = await update_user_room(reg, created.id, "Зал", "sofa")
    assert updated.name == "Зал"
    assert updated.icon == "sofa"

    await delete_user_room(reg, created.id)
    assert await storage.list_user_rooms() == []
    assert reg.all_rooms() == []


async def test_load_user_rooms_on_startup(core):
    reg, _, _ = core
    await create_user_room(reg, "Кухня")
    reg._rooms.clear()

    await load_user_rooms(reg)
    rooms = reg.all_rooms()
    assert len(rooms) == 1
    assert rooms[0].name == "Кухня"


async def test_delete_user_room_scrubs_plan(core):
    reg, _, _ = core
    room = await create_user_room(reg, "Спальня")
    from app.core.models import PlanDevicePosition, PlanRoom

    layout = PlanLayout(
        rooms=[PlanRoom(room_id=room.id, x=0, y=0, width=100, height=80)],
        devices=[
            PlanDevicePosition(
                device_id="demo:x",
                x=10,
                y=10,
                visual_kind="strip",
                attached_room_id=room.id,
            )
        ],
    )
    await storage.kv_set(
        "plan_layout", layout.model_dump(by_alias=True, exclude_none=True)
    )

    await delete_user_room(reg, room.id)

    raw = await storage.kv_get("plan_layout")
    cleaned = PlanLayout.model_validate(raw)
    assert cleaned.rooms == []
    assert cleaned.devices[0].attached_room_id is None
    assert cleaned.devices[0].visual_kind == "bulb"


async def test_rejects_empty_name(core):
    reg, _, _ = core
    with pytest.raises(ValueError):
        await create_user_room(reg, "   ")


async def test_create_room_via_api(client):
    response = await client.post("/rooms", json={"name": "Кабинет"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Кабинет"
    assert body["id"].startswith("core:")

    listed = await client.get("/rooms")
    assert listed.status_code == 200
    assert any(room["id"] == body["id"] for room in listed.json())


async def test_patch_and_delete_via_api(client):
    created = await client.post("/rooms", json={"name": "Прихожая"})
    room_id = created.json()["id"]

    patched = await client.patch(f"/rooms/{room_id}", json={"name": "Холл"})
    assert patched.status_code == 200
    assert patched.json()["name"] == "Холл"

    deleted = await client.delete(f"/rooms/{room_id}")
    assert deleted.status_code == 204

    missing = await client.get("/rooms")
    assert all(room["id"] != room_id for room in missing.json())


async def test_forbid_patch_delete_integration_room(core, client):
    reg, _, store = core
    await store.install(domain="demo")

    living_id = next(room.id for room in reg.all_rooms() if room.id == "living")

    patch = await client.patch(f"/rooms/{living_id}", json={"name": "Hack"})
    assert patch.status_code == 403
    delete = await client.delete(f"/rooms/{living_id}")
    assert delete.status_code == 403
