from app.core.context import IntegrationContext
from app.core.models import Widget

from .weather import router


async def setup(ctx: IntegrationContext) -> None:
    await ctx.register_widget(
        Widget(
            kind="weather",
            id="template:weather",
            title="Погода",
            source_domain="widget_weather",
        )
    )
    ctx.register_router(router)


async def unload(ctx: IntegrationContext) -> None:
    pass
