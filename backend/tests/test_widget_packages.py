"""Widget package install and catalog integration."""
async def test_install_widget_metric_adds_catalog(core):
    registry, manager, store = core
    await store.install(domain="widget_metric")
    assert manager.is_loaded("widget_metric")
    kinds = {w.kind for w in registry.all_widgets()}
    assert "room_sensor" in kinds


async def test_install_widget_weather_registers_router(core):
    registry, manager, store = core
    await store.install(domain="widget_weather")
    assert manager.is_loaded("widget_weather")
    assert "widget_weather" in registry.integration_routers()


async def test_widget_packages_in_store_catalog(core):
    _, _, store = core
    catalog = await store.catalog()
    widgets = [item for item in catalog if item.package_type == "widget"]
    domains = {item.domain for item in widgets}
    assert "widget_metric" in domains
    assert "widget_yandex_station" in domains
