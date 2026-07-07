"""Device scan protocol types (no registry dependency)."""
from __future__ import annotations

from typing import Awaitable, Callable, Protocol

from app.core.models import ScanWsEvent

ScanEmit = Callable[[ScanWsEvent], Awaitable[None]]


class DeviceScanProvider(Protocol):
    async def start_scan(self, emit: ScanEmit) -> None: ...

    async def cancel_scan(self) -> None: ...
