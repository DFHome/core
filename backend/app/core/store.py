"""StoreClient: the DFHome integrations store (HACS model).

The curated index (repositories.json) lists only Git repository URLs and refs.
All catalog metadata (domain, name, version, description, ...) is read from each
integration's manifest.json — single source of truth.

Install/update/uninstall lifecycle is unchanged; see docs/BACKEND_PLAN.md.
"""
import asyncio
import json
import logging
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

import httpx

from app.config import settings
from app.core import storage
from app.core.manager import IntegrationError, IntegrationManager
from app.core.models import PlanLayout, StoreItem

_LOGGER = logging.getLogger(__name__)

_BUNDLED_INDEX = Path(__file__).resolve().parent.parent / "store_index.json"

_GITHUB_RE = re.compile(
    r"^https?://(?:www\.)?github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+?)(?:\.git)?/?$"
)


def _parse_version(value: str) -> tuple[int, ...]:
    parts: list[int] = []
    for chunk in value.strip().lstrip("v").split("."):
        num = ""
        for ch in chunk:
            if ch.isdigit():
                num += ch
            else:
                break
        parts.append(int(num) if num else 0)
    return tuple(parts) or (0,)


def _is_newer(candidate: str, current: str) -> bool:
    return _parse_version(candidate) > _parse_version(current)


def _entry_source_ref(entry: dict[str, Any]) -> tuple[str, str | None]:
    """Resolve git/local source and ref from a thin or legacy index entry."""
    source = entry.get("repository") or entry.get("source")
    if not source:
        raise IntegrationError("Index entry missing 'repository' (or legacy 'source')")
    ref = entry.get("ref")
    return source, ref


def _github_raw_manifest_url(repository: str, ref: str | None) -> str:
    match = _GITHUB_RE.match(repository.rstrip("/"))
    if not match:
        raise IntegrationError(f"Not a GitHub repository URL: {repository}")
    owner = match.group("owner")
    repo = match.group("repo")
    branch = ref or "main"
    return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/manifest.json"


def _validate_manifest_dict(manifest: dict[str, Any]) -> dict[str, Any]:
    if not manifest.get("domain"):
        raise IntegrationError("manifest.json missing 'domain'")
    if not manifest.get("version"):
        raise IntegrationError("manifest.json missing 'version'")
    return manifest


def _source_priority(source: str) -> int:
    """Git remotes beat local test fixtures when the same domain appears twice."""
    return 0 if source.startswith("local:") else 1


class StoreClient:
    def __init__(self, manager: IntegrationManager) -> None:
        self._manager = manager

    # -- index ---------------------------------------------------------------

    def _bundled_index(self) -> list[dict[str, Any]]:
        try:
            data = json.loads(_BUNDLED_INDEX.read_text(encoding="utf-8"))
            return data.get("integrations", [])
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Failed to read bundled store index")
            return []

    async def _remote_index(self) -> list[dict[str, Any]]:
        if not settings.store_index_url:
            return []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(settings.store_index_url)
                resp.raise_for_status()
                return resp.json().get("integrations", [])
        except Exception:  # noqa: BLE001 - remote index is best-effort
            _LOGGER.warning("Remote store index unavailable, using bundled")
            return []

    async def _raw_index(self) -> list[dict[str, Any]]:
        """Merged index entries: remote overrides bundled entries with same source."""
        by_source: dict[str, dict[str, Any]] = {}
        for entry in self._bundled_index():
            try:
                source, _ = _entry_source_ref(entry)
                by_source[source] = entry
            except IntegrationError:
                continue
        for entry in await self._remote_index():
            try:
                source, _ = _entry_source_ref(entry)
                by_source[source] = entry
            except IntegrationError:
                _LOGGER.warning("Skipping invalid remote index entry: %s", entry)
        return list(by_source.values())

    def _bundled_source_dir(self, name: str) -> Path:
        return Path(settings.bundled_integrations_dir).resolve() / name

    def _read_local_manifest(self, local_name: str) -> dict[str, Any]:
        path = self._bundled_source_dir(local_name) / "manifest.json"
        if not path.exists():
            raise IntegrationError(f"manifest.json not found for local:{local_name}")
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            raise IntegrationError(f"Invalid manifest.json for local:{local_name}: {exc}") from exc
        return _validate_manifest_dict(manifest)

    async def _fetch_remote_manifest(self, repository: str, ref: str | None) -> dict[str, Any]:
        url = _github_raw_manifest_url(repository, ref)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            try:
                manifest = resp.json()
            except Exception as exc:  # noqa: BLE001
                raise IntegrationError(f"Invalid manifest.json at {url}: {exc}") from exc
        return _validate_manifest_dict(manifest)

    async def _manifest_for_entry(self, entry: dict[str, Any]) -> dict[str, Any]:
        source, ref = _entry_source_ref(entry)
        if source.startswith("local:"):
            return self._read_local_manifest(source[len("local:") :])
        return await self._fetch_remote_manifest(source, ref)

    async def _resolve_index_entry_by_domain(
        self, domain: str
    ) -> tuple[str, str | None, dict[str, Any]]:
        best: tuple[str, str | None, dict[str, Any]] | None = None
        best_prio = -1
        for entry in await self._raw_index():
            try:
                source, ref = _entry_source_ref(entry)
                manifest = await self._manifest_for_entry(entry)
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Skipping index entry while resolving '%s'", domain, exc_info=True)
                continue
            if manifest.get("domain") != domain:
                continue
            prio = _source_priority(source)
            if prio > best_prio:
                best = (source, ref, manifest)
                best_prio = prio
        if best is None:
            raise IntegrationError(f"No source known for integration '{domain}'")
        return best

    async def catalog(self) -> list[StoreItem]:
        installed = {i["domain"]: i for i in await storage.list_installed()}
        by_domain: dict[str, StoreItem] = {}
        domain_priority: dict[str, int] = {}

        for entry in await self._raw_index():
            try:
                source, ref = _entry_source_ref(entry)
                manifest = await self._manifest_for_entry(entry)
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Could not load manifest for index entry %s", entry, exc_info=True)
                continue

            domain = manifest["domain"]
            prio = _source_priority(source)
            if domain in by_domain and domain_priority.get(domain, 0) >= prio:
                continue

            latest = manifest["version"]
            if domain in installed:
                current = installed[domain]["version"]
                if _is_newer(latest, current):
                    status = "update_available"
                    latest_version = latest
                    version = current
                else:
                    status = "installed"
                    latest_version = None
                    version = current
            else:
                status = "available"
                latest_version = None
                version = latest

            by_domain[domain] = StoreItem(
                domain=domain,
                name=manifest.get("name", domain),
                description=manifest.get("description", ""),
                category=manifest.get("category", "service"),
                version=version,
                author=manifest.get("author", "Community"),
                status=status,
                protocols=manifest.get("protocols", []),
                latest_version=latest_version,
                source=source,
            )
            domain_priority[domain] = prio

        items = list(by_domain.values())
        items.sort(key=lambda item: item.name.lower())
        return items

    # -- source resolution ---------------------------------------------------

    async def _run(self, *args: str) -> None:
        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        out, _ = await proc.communicate()
        if proc.returncode != 0:
            raise IntegrationError(
                f"Command failed ({' '.join(args)}): {out.decode(errors='replace')}"
            )

    async def _fetch_to(self, source: str, ref: str | None, dest: Path) -> None:
        """Materialize an integration's source into `dest`."""
        if source.startswith("local:"):
            src = self._bundled_source_dir(source[len("local:") :])
            if not src.exists():
                raise IntegrationError(f"Bundled source not found: {src}")
            shutil.copytree(src, dest)
            return
        if source.startswith("file://") or Path(source).exists():
            src = Path(source[len("file://") :] if source.startswith("file://") else source)
            if not src.exists():
                raise IntegrationError(f"Local source not found: {src}")
            shutil.copytree(src, dest)
            return
        args = ["git", "clone", "--depth", "1"]
        if ref:
            args += ["--branch", ref]
        args += [source, str(dest)]
        await self._run(*args)
        shutil.rmtree(dest / ".git", ignore_errors=True)

    def _load_manifest(self, package_dir: Path) -> dict[str, Any]:
        manifest_path = package_dir / "manifest.json"
        if not manifest_path.exists():
            raise IntegrationError("manifest.json missing in integration package")
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            raise IntegrationError(f"Invalid manifest.json: {exc}") from exc
        _validate_manifest_dict(manifest)
        if not (package_dir / "__init__.py").exists():
            raise IntegrationError("integration package missing __init__.py")
        return manifest

    async def _install_requirements(self, manifest: dict[str, Any]) -> None:
        reqs = manifest.get("requirements") or []
        if not reqs:
            return
        await self._run("uv", "pip", "install", "--system", *reqs)

    async def _resolve_source_ref(
        self, domain: str, source: str | None, ref: str | None
    ) -> tuple[str, str | None]:
        if source:
            return source, ref
        resolved_source, resolved_ref, _ = await self._resolve_index_entry_by_domain(domain)
        return resolved_source, ref or resolved_ref

    # -- install / update / uninstall ---------------------------------------

    async def install(
        self,
        domain: str | None = None,
        source: str | None = None,
        ref: str | None = None,
    ) -> None:
        resolved_source, resolved_ref = await self._resolve_source_ref(
            domain or "", source, ref
        )
        with tempfile.TemporaryDirectory() as tmp:
            staging = Path(tmp) / "pkg"
            await self._fetch_to(resolved_source, resolved_ref, staging)
            manifest = self._load_manifest(staging)
            resolved_domain = manifest["domain"]
            if domain and domain != resolved_domain:
                raise IntegrationError(
                    f"Manifest domain '{resolved_domain}' != requested '{domain}'"
                )
            await self._install_requirements(manifest)

            target = self._manager.integrations_dir / resolved_domain
            if target.exists():
                raise IntegrationError(f"'{resolved_domain}' already installed")
            shutil.copytree(staging, target)

        await storage.upsert_installed(
            domain=resolved_domain,
            version=manifest["version"],
            source=resolved_source,
            pinned_ref=resolved_ref,
            manifest=manifest,
        )
        await self._manager.load(resolved_domain)

    async def update(self, domain: str) -> None:
        record = await storage.get_installed(domain)
        if record is None:
            raise IntegrationError(f"'{domain}' is not installed")
        source = record.get("source")
        if not source:
            raise IntegrationError(f"No source recorded for '{domain}'")
        _, ref = await self._resolve_source_ref(domain, source, record.get("pinned_ref"))

        target = self._manager.integrations_dir / domain
        backup = target.with_name(f"{domain}.bak")

        await self._manager.unload(domain)
        if backup.exists():
            shutil.rmtree(backup, ignore_errors=True)
        if target.exists():
            target.rename(backup)

        try:
            with tempfile.TemporaryDirectory() as tmp:
                staging = Path(tmp) / "pkg"
                await self._fetch_to(source, ref, staging)
                manifest = self._load_manifest(staging)
                await self._install_requirements(manifest)
                shutil.copytree(staging, target)
            await storage.upsert_installed(
                domain=domain,
                version=manifest["version"],
                source=source,
                pinned_ref=ref,
                manifest=manifest,
            )
            await self._manager.load(domain)
        except Exception:
            _LOGGER.exception("Update of '%s' failed, rolling back", domain)
            if target.exists():
                shutil.rmtree(target, ignore_errors=True)
            if backup.exists():
                backup.rename(target)
            await self._manager.load(domain)
            raise
        finally:
            if backup.exists():
                shutil.rmtree(backup, ignore_errors=True)

    async def uninstall(self, domain: str) -> None:
        record = await storage.get_installed(domain)
        if record is None:
            raise IntegrationError(f"'{domain}' is not installed")

        registry = self._manager._registry  # noqa: SLF001 - internal wiring
        device_ids = registry.device_ids_for_domain(domain)
        room_ids = registry.room_ids_for_domain(domain)
        widget_ids = registry.widget_ids_for_domain(domain)

        await self._manager.unload(domain)

        target = self._manager.integrations_dir / domain
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)

        await storage.remove_installed(domain)
        await self._scrub_references(domain, device_ids, room_ids, widget_ids)

    async def _scrub_references(
        self,
        domain: str,
        device_ids: set[str],
        room_ids: set[str],
        widget_ids: set[str],
    ) -> None:
        prefix = f"{domain}:"

        raw_plan = await storage.kv_get("plan_layout")
        if raw_plan:
            layout = PlanLayout.model_validate(raw_plan)
            layout.devices = [
                d
                for d in layout.devices
                if d.device_id not in device_ids and not d.device_id.startswith(prefix)
            ]
            layout.rooms = [r for r in layout.rooms if r.room_id not in room_ids]
            await storage.kv_set(
                "plan_layout", layout.model_dump(by_alias=True, exclude_none=True)
            )

        raw_widgets = await storage.kv_get("widgets_layout")
        if raw_widgets:
            kept = [
                w
                for w in raw_widgets
                if w.get("id") not in widget_ids
                and not str(w.get("id", "")).startswith(prefix)
                and w.get("deviceId") not in device_ids
            ]
            if kept:
                await storage.kv_set("widgets_layout", kept)
            else:
                await storage.kv_delete("widgets_layout")

    async def add_custom_repo(self, url: str) -> None:
        await storage.add_custom_repo(url)
        await self.install(source=url)
