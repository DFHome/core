from app.core.context import IntegrationContext
from app.core.models import Widget


async def setup(ctx: IntegrationContext) -> None:
    await ctx.register_widget(
        Widget(
            kind="sensor_chart",
            id="template:sensor_chart",
            title="График датчика",
            source_domain="widget_chart",
        )
    )


async def unload(ctx: IntegrationContext) -> None:
    pass
