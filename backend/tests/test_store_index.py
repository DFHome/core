"""Unit tests for store index helpers (thin index + remote manifests)."""
import pytest

from app.core.manager import IntegrationError
from app.core.store import (
    _entry_repository,
    _github_raw_manifest_url,
    _latest_semver_tag_from_ls_remote,
)


def test_entry_repository_thin_format():
    source = _entry_repository(
        {"repository": "https://github.com/DFHome/integration-demo"}
    )
    assert source == "https://github.com/DFHome/integration-demo"


def test_entry_repository_legacy_source_key():
    source = _entry_repository({"source": "local:demo"})
    assert source == "local:demo"


def test_entry_repository_ignores_legacy_ref_field():
    source = _entry_repository(
        {
            "repository": "https://github.com/DFHome/integration-demo",
            "ref": "v1.0.0",
        }
    )
    assert source == "https://github.com/DFHome/integration-demo"


def test_entry_repository_missing_raises():
    with pytest.raises(IntegrationError):
        _entry_repository({})


def test_latest_semver_tag_from_ls_remote_picks_highest():
    output = "\n".join(
        [
            "aaa111\trefs/tags/v1.0.0",
            "bbb222\trefs/tags/v1.1.0",
            "ccc333\trefs/tags/v2.0.0",
            "ddd444\trefs/tags/v1.0.0^{}",
        ]
    )
    assert _latest_semver_tag_from_ls_remote(output) == "v2.0.0"


def test_latest_semver_tag_from_ls_remote_empty():
    assert _latest_semver_tag_from_ls_remote("") is None
    assert _latest_semver_tag_from_ls_remote("aaa\trefs/tags/nightly") is None


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
    assert demo.version == "1.1.0"
    assert demo.author == "DFHome"
    assert "Виртуальные устройства" in demo.description
