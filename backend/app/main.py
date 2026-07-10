"""DFHome core application entry point.

Small FastAPI core: unified device model, registry, event bus + WebSocket push,
SQLite storage, integration manager and the store client. All vendor/protocol
specifics live in integrations, loaded at startup from the data directory.

Routers are mounted at the root (/devices, /store, ...). The frontend calls
them under /api and both nginx (prod) and the Vite dev proxy strip the /api
prefix, so the backend never sees it.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import (
    devices,
    history,
    plan,
    rooms,
    settings as settings_router,
    store,
    widgets,
    ws,
)
from app.core import history as history_service
from app.core.runtime import manager, registry
from app.core.user_rooms import load_user_rooms

logging.basicConfig(level=logging.INFO)
_LOGGER = logging.getLogger(__name__)

integrations_router = APIRouter(prefix="/integrations", tags=["integrations"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    _LOGGER.info("Starting DFHome core, loading installed integrations")
    history_service.bind_registry(registry)
    sampler = asyncio.create_task(history_service.sampler_loop())
    manager.attach_app(app, integrations_router)
    await manager.load_installed()
    await load_user_rooms(registry)
    yield
    sampler.cancel()
    try:
        await sampler
    except asyncio.CancelledError:
        pass
    await manager.unload_all()


app = FastAPI(title="DFHome", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(devices.router)
app.include_router(rooms.router)
app.include_router(plan.router)
app.include_router(widgets.router)
app.include_router(history.router)
app.include_router(store.router)
app.include_router(settings_router.router)
app.include_router(ws.router)
app.include_router(integrations_router)
