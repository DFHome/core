"""Widgets API: default layout, catalog, persistence."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_default_widgets_without_override(client):
    resp = await client.get("/widgets")
    assert resp.status_code == 200
    widgets = resp.json()
    assert len(widgets) == 2
    kinds = {w["kind"] for w in widgets}
    assert kinds == {"plan", "devices_summary"}


async def test_widget_catalog_includes_core(client):
    resp = await client.get("/widgets/catalog")
    assert resp.status_code == 200
    catalog = resp.json()
    core_kinds = {item["kind"] for item in catalog if item["sourceDomain"] == "core"}
    assert core_kinds == {"plan", "devices_summary"}


async def test_save_and_load_widgets(client):
    payload = [
        {
            "kind": "plan",
            "id": "core:plan",
            "title": "Мой план",
            "size": "l",
            "gridRow": 0,
            "gridCol": 0,
            "sourceDomain": "core",
        }
    ]
    put = await client.put("/widgets", json=payload)
    assert put.status_code == 200
    get = await client.get("/widgets")
    assert get.json()[0]["title"] == "Мой план"
