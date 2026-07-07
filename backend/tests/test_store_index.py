"""Unit tests for store index helpers (Variant A: thin index + remote manifests)."""
import pytest

from app.core.manager import IntegrationError
from app.core.store import _entry_source_ref, _github_raw_manifest_url


def test_entry_source_ref_thin_format():
    source, ref = _entry_source_ref(
        {"repository": "https://github.com/DFHome/integration-demo", "ref": "v1.0.0"}
    )
    assert source == "https://github.com/DFHome/integration-demo"
    assert ref == "v1.0.0"


def test_entry_source_ref_legacy_source_key():
    source, ref = _entry_source_ref({"source": "local:demo"})
    assert source == "local:demo"
    assert ref is None


def test_entry_source_ref_missing_raises():
    with pytest.raises(IntegrationError):
        _entry_source_ref({})


def test_github_raw_manifest_url_with_tag():
    url = _github_raw_manifest_url(
        "https://github.com/DFHome/integration-demo", "v1.0.0"
    )
    assert url == (
        "https://raw.githubusercontent.com/DFHome/integration-demo/v1.0.0/manifest.json"
    )


def test_github_raw_manifest_url_strips_git_suffix():
    url = _github_raw_manifest_url(
        "https://github.com/DFHome/integration-demo.git", "main"
    )
    assert url == (
        "https://raw.githubusercontent.com/DFHome/integration-demo/main/manifest.json"
    )


def test_github_raw_manifest_url_default_branch():
    url = _github_raw_manifest_url("https://github.com/DFHome/integration-demo", None)
    assert url.endswith("/main/manifest.json")


async def test_catalog_reads_manifest_metadata(core):
    _, _, store = core
    catalog = await store.catalog()
    demo = next(item for item in catalog if item.domain == "demo")
    assert demo.name == "Демо"
    assert demo.version == "1.0.0"
    assert demo.author == "DFHome"
    assert "Виртуальные устройства" in demo.description
