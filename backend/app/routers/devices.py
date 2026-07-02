from fastapi import APIRouter

from app.models import DeviceActionRequest, DeviceView
from app.yandex.normalize import normalize_device
from app.yandex.official import OfficialClient

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("/{device_id}", response_model=DeviceView)
async def get_device(device_id: str) -> DeviceView:
    client = await OfficialClient.from_storage()
    raw = await client.get_device(device_id)
    return normalize_device(raw)


@router.post("/{device_id}/action", response_model=DeviceView)
async def perform_action(device_id: str, action: DeviceActionRequest) -> DeviceView:
    client = await OfficialClient.from_storage()
    await client.device_action(
        device_id, action.capability_type, action.instance, action.value
    )
    # Re-fetch to return the authoritative post-action state.
    raw = await client.get_device(device_id)
    return normalize_device(raw)
