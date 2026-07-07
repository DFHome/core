"""Mock device discovery for the demo integration.

Simulates a 30-second radar scan, emits discovery events to the core and
registers new devices after a short mock pairing flow.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable

from app.core.models import Device, DiscoveredDevice, ScanWsEvent

from .data import build_discoverable_devices

if TYPE_CHECKING:
    from app.core.context import IntegrationContext
    from app.core.scan_protocol import ScanEmit

SCAN_DURATION_S = 30
CONFIGURE_STEP_S = 0.08
CONFIGURE_TOTAL_S = 2.5
STAGGER_S = 0.4


@dataclass(frozen=True)
class MockDiscovery:
    at_s: int
    device_id: str
    bearing: float
    distance: float


MOCK_DISCOVERIES: tuple[MockDiscovery, ...] = (
    MockDiscovery(6, "demo:light-hall-bulb", 35, 0.55),
    MockDiscovery(14, "demo:sensor-door", 125, 0.72),
    MockDiscovery(21, "demo:switch-hall", 285, 0.42),
)


class DemoScanProvider:
    def __init__(
        self,
        ctx: IntegrationContext,
        index_device: Callable[[Device], None],
    ) -> None:
        self._ctx = ctx
        self._index_device = index_device
        self._cancelled = False
        self._templates = build_discoverable_devices()

    async def cancel_scan(self) -> None:
        self._cancelled = True

    async def start_scan(self, emit: ScanEmit) -> None:
        self._cancelled = False
        discovered: list[DiscoveredDevice] = []
        seen: set[str] = set()

        await emit(
            ScanWsEvent(kind="started", phase="scanning", remaining_seconds=SCAN_DURATION_S)
        )

        for second in range(SCAN_DURATION_S):
            if self._cancelled:
                return

            remaining = SCAN_DURATION_S - second
            await emit(
                ScanWsEvent(
                    kind="tick",
                    phase="scanning",
                    remaining_seconds=remaining,
                )
            )

            for mock in MOCK_DISCOVERIES:
                if mock.at_s != second or mock.device_id in seen:
                    continue
                seen.add(mock.device_id)
                template = self._templates[mock.device_id]
                item = DiscoveredDevice(
                    id=mock.device_id,
                    name=template.name,
                    type=template.type,
                    bearing=mock.bearing,
                    distance=mock.distance,
                    status="found",
                    progress=0,
                )
                discovered.append(item)
                await emit(ScanWsEvent(kind="discovered", phase="scanning", device=item))

            await asyncio.sleep(1)

        if self._cancelled:
            return

        await emit(ScanWsEvent(kind="finished", phase="configuring"))

        if not discovered:
            await emit(ScanWsEvent(kind="complete", phase="complete"))
            return

        for index, item in enumerate(discovered):
            if self._cancelled:
                return
            await asyncio.sleep(STAGGER_S * index)
            await self._configure_device(emit, item)

        if not self._cancelled:
            await emit(ScanWsEvent(kind="complete", phase="complete"))

    async def _configure_device(self, emit: ScanEmit, item: DiscoveredDevice) -> None:
        configuring = item.model_copy(update={"status": "configuring", "progress": 0})
        await emit(
            ScanWsEvent(
                kind="progress",
                phase="configuring",
                device_id=item.id,
                progress=0,
                device=configuring,
            )
        )

        steps = max(1, int(CONFIGURE_TOTAL_S / CONFIGURE_STEP_S))
        for step in range(1, steps + 1):
            if self._cancelled:
                return
            progress = min(100, round(step / steps * 100))
            await emit(
                ScanWsEvent(
                    kind="progress",
                    phase="configuring",
                    device_id=item.id,
                    progress=progress,
                    device=configuring.model_copy(update={"progress": progress}),
                )
            )
            await asyncio.sleep(CONFIGURE_STEP_S)

        device = self._templates[item.id]
        await self._ctx.register_device(device)
        self._index_device(device)
        await self._ctx.push_state(device)

        added = item.model_copy(update={"status": "added", "progress": 100})
        await emit(
            ScanWsEvent(
                kind="added",
                phase="configuring",
                device_id=item.id,
                progress=100,
                device=added,
            )
        )
