"""Test fixtures: isolate each test with its own data dir and reset core state."""
from pathlib import Path

import pytest

from app.config import settings
from app.core import storage
from app.core.events import EventBus, WsManager
from app.core.manager import IntegrationManager
from app.core.registry import DeviceRegistry
from app.core.store import StoreClient

_FIXTURES = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture(autouse=True)
def isolated_data_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", str(tmp_path))
    monkeypatch.setattr(settings, "bundled_integrations_dir", str(_FIXTURES))
    monkeypatch.setattr(settings, "store_index_url", None)
    import app.core.store as store_module

    monkeypatch.setattr(
        store_module, "_BUNDLED_INDEX", _FIXTURES / "store_index.json"
    )
    monkeypatch.setattr(storage, "_initialized", False)
    yield


@pytest.fixture
def core():
    event_bus = EventBus()
    ws_manager = WsManager()
    registry = DeviceRegistry(event_bus, ws_manager)
    manager = IntegrationManager(registry)
    store = StoreClient(manager)
    return registry, manager, store
