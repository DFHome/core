"""Translate raw Yandex device JSON (capabilities/properties) into the
UI-friendly ControlSpec/PropertySpec model, and translate UI actions back
into the Yandex capability payload shape.

Yandex capability types (partial, the ones we render controls for):
  devices.capabilities.on_off        -> switch
  devices.capabilities.range         -> slider (brightness, volume, temperature)
  devices.capabilities.color_setting -> color picker (hsv / rgb / temperature_k)
  devices.capabilities.mode          -> select (thermostat mode, cleanup mode, ...)
  devices.capabilities.toggle        -> switch (backlight, mute, pause, ...)

Property types we surface read-only:
  devices.properties.float  (temperature, humidity, battery_level, ...)
  devices.properties.event  (motion, open, button, ...)
"""
from typing import Any

from app.models import ControlSpec, DeviceView, PropertySpec

_RANGE_UNITS = {
    "brightness": "%",
    "temperature": "°C",
    "channel": "",
    "volume": "%",
    "humidity": "%",
}

_FLOAT_UNITS = {
    "unit.temperature.celsius": "°C",
    "unit.percent": "%",
    "unit.ppm": "ppm",
}


def _capability_label(cap_type: str, instance: str) -> str:
    short = cap_type.rsplit(".", 1)[-1]
    return f"{short}:{instance}"


def normalize_capability(cap: dict) -> ControlSpec | None:
    cap_type = cap.get("type", "")
    state = cap.get("state") or {}
    instance = state.get("instance") or (cap.get("parameters") or {}).get("instance", "")
    retrievable = cap.get("retrievable", True)
    parameters = cap.get("parameters") or {}

    if cap_type == "devices.capabilities.on_off":
        return ControlSpec(
            kind="switch",
            capability_type=cap_type,
            instance=instance or "on",
            label="Включено",
            value=state.get("value"),
            retrievable=retrievable,
        )

    if cap_type == "devices.capabilities.toggle":
        return ControlSpec(
            kind="switch",
            capability_type=cap_type,
            instance=instance,
            label=_capability_label(cap_type, instance),
            value=state.get("value"),
            retrievable=retrievable,
        )

    if cap_type == "devices.capabilities.range":
        range_params = parameters.get("range") or {}
        return ControlSpec(
            kind="slider",
            capability_type=cap_type,
            instance=instance,
            label=_capability_label(cap_type, instance),
            value=state.get("value"),
            min=range_params.get("min", 0),
            max=range_params.get("max", 100),
            precision=range_params.get("precision", 1),
            unit=_RANGE_UNITS.get(instance, ""),
            retrievable=retrievable,
        )

    if cap_type == "devices.capabilities.mode":
        modes = [m.get("value") for m in parameters.get("modes", [])]
        return ControlSpec(
            kind="mode",
            capability_type=cap_type,
            instance=instance,
            label=_capability_label(cap_type, instance),
            value=state.get("value"),
            options=modes,
            retrievable=retrievable,
        )

    if cap_type == "devices.capabilities.color_setting":
        # color_setting can expose several instances (hsv, rgb, temperature_k);
        # each capability entry in Yandex's payload already targets one.
        color_model = instance if instance in ("hsv", "rgb", "temperature_k") else "hsv"
        return ControlSpec(
            kind="color",
            capability_type=cap_type,
            instance=instance or color_model,
            label=_capability_label(cap_type, instance or color_model),
            value=state.get("value"),
            color_model=color_model,
            retrievable=retrievable,
        )

    # Unknown/unsupported capability: still surface it as read-only so the
    # user can see it exists, rather than silently dropping data.
    return ControlSpec(
        kind="unsupported",
        capability_type=cap_type,
        instance=instance,
        label=_capability_label(cap_type, instance),
        value=state.get("value"),
        retrievable=retrievable,
    )


def normalize_property(prop: dict) -> PropertySpec:
    prop_type = prop.get("type", "")
    state = prop.get("state") or {}
    instance = state.get("instance", "")
    parameters = prop.get("parameters") or {}
    unit = _FLOAT_UNITS.get(parameters.get("unit", ""), "")
    return PropertySpec(
        property_type=prop_type,
        instance=instance,
        label=_capability_label(prop_type, instance),
        value=state.get("value"),
        unit=unit,
    )


def normalize_device(raw: dict, room_name: str | None = None) -> DeviceView:
    controls = [
        c
        for cap in raw.get("capabilities", [])
        if (c := normalize_capability(cap)) is not None
    ]
    properties = [normalize_property(p) for p in raw.get("properties", [])]
    return DeviceView(
        id=raw["id"],
        name=raw.get("name", raw["id"]),
        type=raw.get("type", "unknown"),
        room=room_name,
        household_id=(raw.get("household") or {}).get("id"),
        online=raw.get("state", "online") != "offline",
        controls=controls,
        properties=properties,
    )


def build_action_value(control: ControlSpec, raw_value: Any) -> Any:
    """Pass-through for now; kept as a hook in case Yandex needs coercion
    (e.g. hsv object shape) that differs from what the frontend sends."""
    return raw_value
