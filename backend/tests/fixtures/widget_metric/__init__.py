from app.core.context import IntegrationContext
from app.core.models import Widget


async def setup(ctx: IntegrationContext) -> None:
    await ctx.register_widget(
        Widget(
            kind="room_sensor",
            id="template:room_sensor",
            title="Показатель",
            source_domain="widget_metric",
        )
    )


async def unload(ctx: IntegrationContext) -> None:
    pass
