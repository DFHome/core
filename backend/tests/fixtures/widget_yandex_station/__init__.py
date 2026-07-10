from app.core.context import IntegrationContext
from app.core.models import Widget


async def setup(ctx: IntegrationContext) -> None:
    await ctx.register_widget(
        Widget(
            kind="station",
            id="template:station",
            title="Яндекс Станция",
            source_domain="widget_yandex_station",
        )
    )


async def unload(ctx: IntegrationContext) -> None:
    pass
