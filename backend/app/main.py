from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import devices, home, scenarios, settings as settings_router
from app.yandex.errors import NotAuthenticatedError, UpstreamAuthError, YandexApiError

app = FastAPI(title="DFHome", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotAuthenticatedError)
async def not_authenticated_handler(request: Request, exc: NotAuthenticatedError):
    return JSONResponse(status_code=428, content={"detail": exc.message})


@app.exception_handler(UpstreamAuthError)
async def upstream_auth_handler(request: Request, exc: UpstreamAuthError):
    return JSONResponse(status_code=401, content={"detail": exc.message})


@app.exception_handler(YandexApiError)
async def yandex_api_error_handler(request: Request, exc: YandexApiError):
    return JSONResponse(status_code=exc.status_code or 502, content={"detail": exc.message})


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(settings_router.router)
app.include_router(home.router)
app.include_router(devices.router)
app.include_router(scenarios.router)
