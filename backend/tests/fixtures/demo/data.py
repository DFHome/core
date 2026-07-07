"""Mock data for the demo integration.

This module is the single place where demo content lives. Everything showcased
in DFHome (devices, rooms, dashboard widgets, a suggested floor plan) is defined
here, so installing the demo integration lights up the whole app.
"""
from app.core.models import (
    Capability,
    Device,
    Entity,
    PlanDevicePosition,
    PlanLayout,
    PlanRoom,
    Property,
    Room,
    Widget,
)

DOMAIN = "demo"


def build_rooms() -> list[Room]:
    return [
        Room(id="living", name="Гостиная", icon="Sofa"),
        Room(id="bedroom", name="Спальня", icon="BedDouble"),
        Room(id="kitchen", name="Кухня", icon="CookingPot"),
        Room(id="office", name="Кабинет", icon="Laptop"),
        Room(id="hall", name="Коридор", icon="DoorOpen"),
    ]


def build_devices() -> list[Device]:
    return [
        Device(
            id="demo:light-living-ceiling",
            integration=DOMAIN,
            name="Люстра",
            type="light",
            room_id="living",
            online=True,
            entities=[
                Entity(
                    id="demo:light-living-ceiling:main",
                    name="Люстра",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=True),
                        Capability(
                            kind="slider",
                            instance="brightness",
                            label="Яркость",
                            value=78,
                            min=0,
                            max=100,
                            step=1,
                            unit="%",
                        ),
                    ],
                )
            ],
        ),
        Device(
            id="demo:socket-living-tv",
            integration=DOMAIN,
            name="Розетка ТВ",
            type="socket",
            room_id="living",
            online=True,
            entities=[
                Entity(
                    id="demo:socket-living-tv:main",
                    name="Розетка ТВ",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=True),
                    ],
                    properties=[
                        Property(kind="power", instance="power", label="Мощность", value=142, unit="Вт"),
                    ],
                )
            ],
        ),
        Device(
            id="demo:sensor-bedroom-climate",
            integration=DOMAIN,
            name="Датчик климата",
            type="sensor",
            room_id="bedroom",
            online=True,
            entities=[
                Entity(
                    id="demo:sensor-bedroom-climate:main",
                    name="Датчик климата",
                    properties=[
                        Property(kind="temperature", instance="temp", label="Температура", value=22.4, unit="°C"),
                        Property(kind="humidity", instance="humidity", label="Влажность", value=47, unit="%"),
                        Property(kind="battery", instance="battery", label="Батарея", value=82, unit="%"),
                    ],
                )
            ],
        ),
        Device(
            id="demo:light-bedroom-lamp",
            integration=DOMAIN,
            name="Ночник",
            type="light",
            room_id="bedroom",
            online=True,
            entities=[
                Entity(
                    id="demo:light-bedroom-lamp:main",
                    name="Ночник",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=False),
                        Capability(
                            kind="slider",
                            instance="brightness",
                            label="Яркость",
                            value=30,
                            min=0,
                            max=100,
                            step=1,
                            unit="%",
                        ),
                        Capability(
                            kind="color",
                            instance="color",
                            label="Цвет",
                            value=0xFFA040,
                            color_model="rgb",
                        ),
                    ],
                )
            ],
        ),
        Device(
            id="demo:switch-kitchen-kettle",
            integration=DOMAIN,
            name="Чайник",
            type="socket",
            room_id="kitchen",
            online=False,
            entities=[
                Entity(
                    id="demo:switch-kitchen-kettle:main",
                    name="Чайник",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=False),
                    ],
                    properties=[
                        Property(kind="temperature", instance="temp", label="Температура воды", value=None, unit="°C"),
                    ],
                )
            ],
        ),
        Device(
            id="demo:light-kitchen-strip",
            integration=DOMAIN,
            name="Лента кухни",
            type="light",
            room_id="kitchen",
            online=True,
            entities=[
                Entity(
                    id="demo:light-kitchen-strip:main",
                    name="Лента кухни",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=True),
                        Capability(
                            kind="slider",
                            instance="brightness",
                            label="Яркость",
                            value=64,
                            min=0,
                            max=100,
                            step=1,
                            unit="%",
                        ),
                        Capability(
                            kind="color",
                            instance="color",
                            label="Цвет",
                            value=16762880,
                            color_model="rgb",
                        ),
                    ],
                )
            ],
        ),
        Device(
            id="demo:media-office-speaker",
            integration=DOMAIN,
            name="Умная колонка",
            type="media_device",
            room_id="office",
            online=True,
            entities=[
                Entity(
                    id="demo:media-office-speaker:main",
                    name="Умная колонка",
                    capabilities=[
                        Capability(
                            kind="slider",
                            instance="volume",
                            label="Громкость",
                            value=40,
                            min=0,
                            max=100,
                            step=1,
                            unit="%",
                        ),
                    ],
                )
            ],
        ),
    ]


def build_discoverable_devices() -> dict[str, Device]:
    """Devices that appear only after a successful radar scan pairing."""
    return {
        "demo:light-hall-bulb": Device(
            id="demo:light-hall-bulb",
            integration=DOMAIN,
            name="Лампа коридор",
            type="light",
            room_id="hall",
            online=True,
            entities=[
                Entity(
                    id="demo:light-hall-bulb:main",
                    name="Лампа коридор",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=False),
                        Capability(
                            kind="slider",
                            instance="brightness",
                            label="Яркость",
                            value=60,
                            min=0,
                            max=100,
                            step=1,
                            unit="%",
                        ),
                    ],
                )
            ],
        ),
        "demo:sensor-door": Device(
            id="demo:sensor-door",
            integration=DOMAIN,
            name="Датчик двери",
            type="sensor",
            room_id="hall",
            online=True,
            entities=[
                Entity(
                    id="demo:sensor-door:main",
                    name="Датчик двери",
                    properties=[
                        Property(
                            kind="motion",
                            instance="motion",
                            label="Движение",
                            value=False,
                        ),
                        Property(
                            kind="battery",
                            instance="battery",
                            label="Батарея",
                            value=91,
                            unit="%",
                        ),
                    ],
                )
            ],
        ),
        "demo:switch-hall": Device(
            id="demo:switch-hall",
            integration=DOMAIN,
            name="Выключатель",
            type="switch",
            room_id="hall",
            online=True,
            entities=[
                Entity(
                    id="demo:switch-hall:main",
                    name="Выключатель",
                    capabilities=[
                        Capability(kind="switch", instance="on", label="Питание", value=False),
                    ],
                )
            ],
        ),
    }


def build_widgets() -> list[Widget]:
    return [
        Widget(
            kind="weather",
            id="w-weather",
            title="Погода",
            location="Москва",
            temperature=12,
            condition="Облачно",
            humidity=68,
            wind_speed=4,
        ),
        Widget(kind="devices_summary", id="w-summary", title="Устройства"),
        Widget(
            kind="sensor",
            id="w-climate",
            title="Климат в спальне",
            device_id="demo:sensor-bedroom-climate",
        ),
        Widget(
            kind="media",
            id="w-media",
            title="Сейчас играет",
            device_id="demo:media-office-speaker",
            track="Nightcall",
            artist="Kavinsky",
            playing=True,
        ),
    ]


def build_plan() -> PlanLayout:
    return PlanLayout(
        rooms=[
            PlanRoom(room_id="living", x=24, y=260, width=430, height=270),
            PlanRoom(room_id="office", x=24, y=24, width=250, height=210),
            PlanRoom(room_id="bedroom", x=520, y=260, width=340, height=270),
            PlanRoom(room_id="kitchen", x=520, y=24, width=340, height=210),
        ],
        devices=[
            PlanDevicePosition(device_id="demo:light-living-ceiling", x=210, y=370, visual_kind="bulb"),
            PlanDevicePosition(device_id="demo:socket-living-tv", x=390, y=455, visual_kind="bulb"),
            PlanDevicePosition(device_id="demo:sensor-bedroom-climate", x=595, y=430, visual_kind="bulb"),
            PlanDevicePosition(device_id="demo:light-bedroom-lamp", x=700, y=365, visual_kind="bulb"),
            PlanDevicePosition(device_id="demo:switch-kitchen-kettle", x=780, y=145, visual_kind="bulb"),
            PlanDevicePosition(
                device_id="demo:light-kitchen-strip",
                x=690,
                y=120,
                visual_kind="strip",
                attached_room_id="kitchen",
            ),
            PlanDevicePosition(device_id="demo:media-office-speaker", x=115, y=145, visual_kind="bulb"),
        ],
    )
