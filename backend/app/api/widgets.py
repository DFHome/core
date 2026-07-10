"""Dashboard widgets API."""
from fastapi import APIRouter, Body

from app.core import storage
from app.core.models import Widget, WidgetCatalogItem
from app.core.runtime import registry

router = APIRouter(prefix="/widgets", tags=["widgets"])

_CORE_CATALOG: list[WidgetCatalogItem] = [
    WidgetCatalogItem(
        kind="plan",
        source_domain="core",
        title="План дома",
        description="Визуальный план с комнатами и устройствами",
    ),
    WidgetCatalogItem(
        kind="devices_summary",
        source_domain="core",
        title="Устройства",
        description="Сводка по устройствам: всего, онлайн, активны",
    ),
]


def default_dashboard() -> list[Widget]:
    return [
        Widget(
            kind="plan",
            id="core:plan",
            title="План дома",
            size="l",
            grid_row=0,
            grid_col=0,
            source_domain="core",
        ),
        Widget(
            kind="devices_summary",
            id="core:devices",
            title="Устройства",
            size="s",
            grid_row=2,
            grid_col=0,
            source_domain="core",
        ),
    ]


def build_catalog() -> list[WidgetCatalogItem]:
    items = list(_CORE_CATALOG)
    seen: set[tuple[str, str]] = {(i.source_domain, i.kind) for i in items}
    for widget in registry.all_widgets():
        domain = widget.source_domain or "unknown"
        key = (domain, widget.kind)
        if key in seen:
            continue
        seen.add(key)
        items.append(
            WidgetCatalogItem(
                kind=widget.kind,
                source_domain=domain,
                title=widget.title,
                description=None,
            )
        )
    return items


@router.get("", response_model=list[Widget])
async def get_widgets() -> list[Widget]:
    raw = await storage.kv_get("widgets_layout")
    if raw:
        return [Widget.model_validate(item) for item in raw]
    return default_dashboard()


@router.put("", response_model=list[Widget])
async def save_widgets(payload: list[Widget] = Body(...)) -> list[Widget]:
    await storage.kv_set(
        "widgets_layout",
        [w.model_dump(by_alias=True, exclude_none=True) for w in payload],
    )
    return payload


@router.delete("", response_model=list[Widget])
async def reset_widgets() -> list[Widget]:
    await storage.kv_delete("widgets_layout")
    return default_dashboard()


@router.get("/catalog", response_model=list[WidgetCatalogItem])
async def get_widget_catalog() -> list[WidgetCatalogItem]:
    return build_catalog()
