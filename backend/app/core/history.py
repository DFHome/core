"""Periodic sampling of numeric device properties into SQLite for chart widgets."""
import asyncio
import logging
import time
from typing import TYPE_CHECKING, Any

import aiosqlite

from app.config import settings

if TYPE_CHECKING:
    from app.core.registry import DeviceRegistry

_LOGGER = logging.getLogger(__name__)

SAMPLE_INTERVAL_SECONDS = 60
RETENTION_SECONDS = 48 * 60 * 60
MIN_INSERT_INTERVAL_SECONDS = 30

_lock = asyncio.Lock()
_initialized = False
_registry: "DeviceRegistry | None" = None


def bind_registry(registry: "DeviceRegistry") -> None:
    global _registry
    _registry = registry


async def _ensure_db() -> None:
    global _initialized
    if _initialized:
        return
    async with _lock:
        if _initialized:
            return
        async with aiosqlite.connect(settings.database_path) as db:
            await db.execute(
                "CREATE TABLE IF NOT EXISTS sensor_history ("
                "device_id TEXT NOT NULL, instance TEXT NOT NULL, "
                "ts INTEGER NOT NULL, value REAL NOT NULL)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_sensor_history "
                "ON sensor_history (device_id, instance, ts)"
            )
            await db.commit()
        _initialized = True


def _rows_from_registry() -> list[tuple[str, str, int, float]]:
    if _registry is None:
        return []
    now = int(time.time())
    rows: list[tuple[str, str, int, float]] = []
    for device in _registry.all_devices():
        for entity in device.entities:
            for prop in entity.properties:
                if isinstance(prop.value, (int, float)) and not isinstance(
                    prop.value, bool
                ):
                    rows.append(
                        (device.id, prop.instance, now, float(prop.value))
                    )
    return rows


async def ingest_readings(rows: list[tuple[str, str, int, float]]) -> None:
    if not rows:
        return

    await _ensure_db()
    to_insert: list[tuple[str, str, int, float]] = []

    async with aiosqlite.connect(settings.database_path) as db:
        for device_id, instance, ts, value in rows:
            cur = await db.execute(
                "SELECT ts, value FROM sensor_history "
                "WHERE device_id = ? AND instance = ? ORDER BY ts DESC LIMIT 1",
                (device_id, instance),
            )
            last = await cur.fetchone()
            if last:
                last_ts, last_val = last
                if value == last_val and ts - last_ts < MIN_INSERT_INTERVAL_SECONDS:
                    continue
            to_insert.append((device_id, instance, ts, value))

        if to_insert:
            await db.executemany(
                "INSERT INTO sensor_history (device_id, instance, ts, value) "
                "VALUES (?, ?, ?, ?)",
                to_insert,
            )
            now = int(time.time())
            await db.execute(
                "DELETE FROM sensor_history WHERE ts < ?", (now - RETENTION_SECONDS,)
            )
            await db.commit()


async def record_snapshot() -> None:
    await ingest_readings(_rows_from_registry())


async def get_history(device_id: str, hours: int) -> dict[str, list[dict[str, Any]]]:
    await _ensure_db()
    since = int(time.time()) - hours * 3600
    async with aiosqlite.connect(settings.database_path) as db:
        cur = await db.execute(
            "SELECT instance, ts, value FROM sensor_history "
            "WHERE device_id = ? AND ts >= ? ORDER BY ts",
            (device_id, since),
        )
        rows = await cur.fetchall()

    series: dict[str, list[dict[str, Any]]] = {}
    for instance, ts, value in rows:
        series.setdefault(instance, []).append({"ts": ts, "value": value})
    return series


async def get_latest(device_id: str) -> dict[str, dict[str, Any]]:
    await _ensure_db()
    async with aiosqlite.connect(settings.database_path) as db:
        cur = await db.execute(
            "SELECT sh.instance, sh.ts, sh.value "
            "FROM sensor_history sh "
            "INNER JOIN ("
            "  SELECT instance, MAX(ts) AS ts "
            "  FROM sensor_history WHERE device_id = ? GROUP BY instance"
            ") t ON sh.device_id = ? AND sh.instance = t.instance AND sh.ts = t.ts",
            (device_id, device_id),
        )
        rows = await cur.fetchall()

    return {instance: {"ts": ts, "value": value} for instance, ts, value in rows}


async def get_device_history(device_id: str, hours: int) -> dict[str, Any]:
    series = await get_history(device_id, hours)
    latest = await get_latest(device_id)
    return {"series": series, "latest": latest}


async def sampler_loop() -> None:
    while True:
        try:
            await record_snapshot()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            _LOGGER.warning("Sensor history snapshot failed: %s", exc)
        await asyncio.sleep(SAMPLE_INTERVAL_SECONDS)
