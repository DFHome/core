"""Store lifecycle: install / update / fully clean uninstall of an integration."""
from pathlib import Path

import pytest

from app.config import settings
from app.core import storage
from app.core.manager import IntegrationError


async def test_install_demo_from_local_source(core):
    registry, manager, store = core
    await store.install(domain="demo")

    assert manager.is_loaded("demo")
    assert registry.get_device("demo:light-living-ceiling") is not None
    assert len(registry.all_rooms()) == 5
    assert len(registry.all_widgets()) == 0
    installed = await storage.list_installed()
    assert installed[0]["domain"] == "demo"
    assert (Path(settings.integrations_dir) / "demo" / "__init__.py").exists()


async def test_command_updates_state(core):
    registry, manager, store = core
    await store.install(domain="demo")

    await manager.dispatch_command(
        "demo:light-bedroom-lamp", "demo:light-bedroom-lamp:main", "on", True
    )
    device = registry.get_device("demo:light-bedroom-lamp")
    on_cap = next(
        c for c in device.entities[0].capabilities if c.instance == "on"
    )
    assert on_cap.value is True


async def test_uninstall_is_residue_free(core):
    registry, manager, store = core
    await store.install(domain="demo")

    # Persist a plan referencing demo devices/rooms to prove it gets scrubbed.
    await storage.kv_set(
        "plan_layout",
        {
            "rooms": [{"roomId": "living", "x": 0, "y": 0, "width": 10, "height": 10}],
            "devices": [{"deviceId": "demo:light-living-ceiling", "x": 1, "y": 1, "visualKind": "bulb"}],
        },
    )

    await store.uninstall("demo")

    assert not manager.is_loaded("demo")
    assert registry.all_devices() == []
    assert await storage.list_installed() == []
    assert not (Path(settings.integrations_dir) / "demo").exists()

    plan = await storage.kv_get("plan_layout")
    assert plan["devices"] == []
    assert plan["rooms"] == []


async def test_reinstall_after_uninstall(core):
    registry, manager, store = core
    await store.install(domain="demo")
    await store.uninstall("demo")
    await store.install(domain="demo")
    assert manager.is_loaded("demo")
    assert registry.get_device("demo:light-living-ceiling") is not None


async def test_update_keeps_config_and_reloads(core):
    registry, manager, store = core
    await store.install(domain="demo")
    await storage.set_config_entry("demo", {"foo": "bar"})

    await store.update("demo")

    assert manager.is_loaded("demo")
    assert await storage.get_config_entry("demo") == {"foo": "bar"}
    installed = await storage.get_installed("demo")
    assert installed["version"] == "1.1.0"


async def test_update_missing_integration_raises(core):
    _, _, store = core
    with pytest.raises(IntegrationError):
        await store.update("nope")


async def test_catalog_marks_installed(core):
    _, _, store = core
    await store.install(domain="demo")
    catalog = await store.catalog()
    demo = next(item for item in catalog if item.domain == "demo")
    assert demo.status == "installed"


async def test_install_from_absolute_path(core):
    _, manager, store = core
    demo_path = str(Path(settings.bundled_integrations_dir) / "demo")
    await store.install(source=demo_path)
    assert manager.is_loaded("demo")


async def test_install_from_upload(core):
    _, manager, store = core
    demo_dir = Path(settings.bundled_integrations_dir) / "demo"
    files: list[tuple[str, bytes]] = []
    for path in demo_dir.rglob("*"):
        if path.is_file():
            rel = path.relative_to(demo_dir).as_posix()
            files.append((rel, path.read_bytes()))
    await store.install_from_upload(files)
    assert manager.is_loaded("demo")
    installed = await storage.get_installed("demo")
    assert installed["source"] == "upload:demo"


async def test_catalog_lists_custom_repos(core):
    _, _, store = core
    await storage.add_custom_repo("local:demo")
    catalog = await store.catalog()
    assert any(item.domain == "demo" for item in catalog)
