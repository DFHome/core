"""Store API: catalog and install/update/uninstall of integrations."""
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core import install_progress, storage
from app.core.manager import IntegrationError
from app.core.models import InstallProgress, StoreItem
from app.core.runtime import store_client

router = APIRouter(prefix="/store", tags=["store"])


class InstallRequest(BaseModel):
    domain: str | None = None
    source: str | None = None
    ref: str | None = None


class DomainRequest(BaseModel):
    domain: str


class CustomRepoRequest(BaseModel):
    url: str
    ref: str | None = None


class LocalPathRequest(BaseModel):
    path: str


@router.get("", response_model=list[StoreItem])
async def catalog() -> list[StoreItem]:
    return await store_client.catalog()


@router.get("/progress/{domain}", response_model=InstallProgress | None)
async def install_progress_status(domain: str) -> InstallProgress | None:
    progress = await install_progress.get(domain)
    if progress is None:
        return None
    return InstallProgress(
        domain=progress.domain,
        step=progress.step,
        percent=progress.percent,
        status=progress.status,
    )


@router.post("/install")
async def install(payload: InstallRequest) -> dict:
    try:
        await store_client.install(payload.domain, payload.source, payload.ref)
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@router.post("/update")
async def update(payload: DomainRequest) -> dict:
    try:
        await store_client.update(payload.domain)
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@router.post("/uninstall")
async def uninstall(payload: DomainRequest) -> dict:
    try:
        await store_client.uninstall(payload.domain)
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@router.post("/custom-repo")
async def add_custom_repo(payload: CustomRepoRequest) -> dict:
    try:
        await store_client.add_custom_repo(payload.url, payload.ref)
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@router.post("/install-local")
async def install_local(payload: LocalPathRequest) -> dict:
    path = payload.path.strip()
    if not path:
        raise HTTPException(status_code=400, detail="Укажите путь к папке пакета")
    try:
        await store_client.install(source=path)
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@router.post("/install-upload")
async def install_upload(files: list[UploadFile] = File(...)) -> dict:
    if not files:
        raise HTTPException(status_code=400, detail="Выберите папку с пакетом")
    payload: list[tuple[str, bytes]] = []
    for upload in files:
        name = (upload.filename or upload.file.name or "file").replace("\\", "/")
        content = await upload.read()
        payload.append((name, content))
    try:
        await store_client.install_from_upload(payload)
    except IntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@router.get("/custom-repos", response_model=list[str])
async def list_custom_repos() -> list[str]:
    return await storage.list_custom_repos()
