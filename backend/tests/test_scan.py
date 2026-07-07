"""Device scan API and coordinator."""
import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.events import EventBus, WsManager
from app.core.models import DiscoveredDevice, ScanWsEvent
from app.core.registry import DeviceRegistry
from app.core.runtime import manager, scan_coordinator, store_client
from app.core.scan import CoreScanProvider, DeviceScanCoordinator
from app.core.scan_protocol import ScanEmit
from app.main import app


class StubScanProvider:
    def __init__(self) -> None:
        self.cancelled = False
        self.started = asyncio.Event()

    async def cancel_scan(self) -> None:
        self.cancelled = True

    async def start_scan(self, emit: ScanEmit) -> None:
        self.started.set()
        await emit(
            ScanWsEvent(
                kind="started",
                phase="scanning",
                remaining_seconds=5,
            )
        )
        await emit(
            ScanWsEvent(
                kind="discovered",
                phase="scanning",
                device=DiscoveredDevice(
                    id="demo:test",
                    name="Test",
                    type="light",
                    bearing=10,
                    distance=0.5,
                ),
            )
        )
        await emit(ScanWsEvent(kind="complete", phase="complete"))


@pytest.fixture(autouse=True)
async def reset_runtime_scan():
    await scan_coordinator.cancel()
    yield
    await scan_coordinator.cancel()


@pytest.mark.asyncio
async def test_core_scan_provider_completes_without_devices():
    ws = WsManager()
    coordinator = DeviceScanCoordinator(DeviceRegistry(EventBus(), ws), ws)
    coordinator._providers = [CoreScanProvider(duration_s=1)]  # noqa: SLF001

    received: list[ScanWsEvent] = []

    class CaptureSocket:
        async def accept(self) -> None:
            return None

        async def send_json(self, payload: dict) -> None:
            if payload.get("type") == "device_scan" and payload.get("scan"):
                received.append(ScanWsEvent.model_validate(payload["scan"]))

    socket = CaptureSocket()
    await ws.connect(socket)  # type: ignore[arg-type]

    await coordinator._run([CoreScanProvider(duration_s=1)])  # noqa: SLF001

    kinds = [event.kind for event in received]
    assert "started" in kinds
    assert "complete" in kinds
    assert "discovered" not in kinds


@pytest.mark.asyncio
async def test_scan_coordinator_emits_ws_events():
    ws = WsManager()
    registry = DeviceRegistry(EventBus(), ws)
    provider = StubScanProvider()
    registry.register_scan_provider("demo", provider)
    coordinator = DeviceScanCoordinator(registry, ws)

    received: list[ScanWsEvent] = []

    class CaptureSocket:
        async def accept(self) -> None:
            return None

        async def send_json(self, payload: dict) -> None:
            if payload.get("type") == "device_scan" and payload.get("scan"):
                received.append(ScanWsEvent.model_validate(payload["scan"]))

    socket = CaptureSocket()
    await ws.connect(socket)  # type: ignore[arg-type]

    await coordinator.start()
    await provider.started.wait()
    await asyncio.sleep(0.05)

    kinds = [event.kind for event in received]
    assert "started" in kinds
    assert "discovered" in kinds
    assert "complete" in kinds


@pytest.mark.asyncio
async def test_scan_start_without_integration_uses_core_provider():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/devices/scan/start")
    assert response.status_code == 200
    assert response.json()["ok"] is True

    await scan_coordinator.cancel()


@pytest.mark.asyncio
async def test_scan_start_with_demo_integration():
    if manager.is_loaded("demo"):
        await manager.unload("demo")
    await store_client.install(domain="demo")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/devices/scan/start")
    assert response.status_code == 200
    assert response.json()["ok"] is True

    await scan_coordinator.cancel()
