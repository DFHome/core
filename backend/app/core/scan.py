"""Device scan coordinator: delegates discovery to integrations and fans out WS events."""
from __future__ import annotations

import asyncio
import logging

from app.core.events import WsManager
from app.core.models import ScanWsEvent, WsMessage
from app.core.registry import DeviceRegistry
from app.core.scan_protocol import DeviceScanProvider, ScanEmit

_LOGGER = logging.getLogger(__name__)

SCAN_DURATION_S = 30


class CoreScanProvider:
    """Empty scan shell when no integration contributes device discovery."""

    def __init__(self, duration_s: int = SCAN_DURATION_S) -> None:
        self._duration_s = duration_s
        self._cancelled = False

    async def cancel_scan(self) -> None:
        self._cancelled = True

    async def start_scan(self, emit: ScanEmit) -> None:
        self._cancelled = False
        await emit(
            ScanWsEvent(
                kind="started",
                phase="scanning",
                remaining_seconds=self._duration_s,
            )
        )

        for second in range(self._duration_s):
            if self._cancelled:
                return

            remaining = self._duration_s - second
            await emit(
                ScanWsEvent(
                    kind="tick",
                    phase="scanning",
                    remaining_seconds=remaining,
                )
            )
            await asyncio.sleep(1)

        if self._cancelled:
            return

        await emit(ScanWsEvent(kind="complete", phase="complete"))


class DeviceScanCoordinator:
    def __init__(self, registry: DeviceRegistry, ws_manager: WsManager) -> None:
        self._registry = registry
        self._ws = ws_manager
        self._task: asyncio.Task[None] | None = None
        self._providers: list[DeviceScanProvider] = []
        self._lock = asyncio.Lock()

    @property
    def is_active(self) -> bool:
        return self._task is not None and not self._task.done()

    async def start(self) -> None:
        async with self._lock:
            await self._stop_unlocked()
            integration_providers = list(self._registry.all_scan_providers().values())
            self._providers = (
                integration_providers
                if integration_providers
                else [CoreScanProvider()]
            )
            self._task = asyncio.create_task(self._run(self._providers))

    async def cancel(self) -> None:
        async with self._lock:
            await self._stop_unlocked()
            await self._broadcast(ScanWsEvent(kind="cancelled", phase=None))

    async def _stop_unlocked(self) -> None:
        for provider in self._providers:
            try:
                await provider.cancel_scan()
            except Exception:  # noqa: BLE001
                _LOGGER.exception("scan provider cancel failed")
        self._providers.clear()
        if self._task is not None and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None

    async def _broadcast(self, event: ScanWsEvent) -> None:
        await self._ws.broadcast(WsMessage(type="device_scan", scan=event))

    async def _run(self, providers: list[DeviceScanProvider]) -> None:
        async def emit(event: ScanWsEvent) -> None:
            await self._broadcast(event)

        try:
            await asyncio.gather(*(provider.start_scan(emit) for provider in providers))
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            _LOGGER.exception("device scan failed")
            await emit(ScanWsEvent(kind="cancelled", phase=None))
        finally:
            self._providers.clear()
            self._task = None
