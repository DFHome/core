"""In-memory install/update progress for the integrations store."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Literal

ProgressStatus = Literal["running", "done", "error"]


@dataclass
class InstallProgress:
    domain: str
    step: str
    percent: int
    status: ProgressStatus = "running"


_progress: dict[str, InstallProgress] = {}
_lock = asyncio.Lock()


async def set_progress(domain: str, step: str, percent: int) -> None:
    percent = max(0, min(100, percent))
    async with _lock:
        _progress[domain] = InstallProgress(
            domain=domain,
            step=step,
            percent=percent,
            status="running",
        )


async def complete(domain: str) -> None:
    async with _lock:
        current = _progress.get(domain)
        if current is None:
            _progress[domain] = InstallProgress(
                domain=domain,
                step="Готово",
                percent=100,
                status="done",
            )
            return
        _progress[domain] = InstallProgress(
            domain=domain,
            step="Готово",
            percent=100,
            status="done",
        )


async def fail(domain: str, step: str = "Ошибка") -> None:
    async with _lock:
        current = _progress.get(domain)
        percent = current.percent if current else 0
        _progress[domain] = InstallProgress(
            domain=domain,
            step=step,
            percent=percent,
            status="error",
        )


async def get(domain: str) -> InstallProgress | None:
    async with _lock:
        return _progress.get(domain)


async def clear(domain: str) -> None:
    async with _lock:
        _progress.pop(domain, None)
