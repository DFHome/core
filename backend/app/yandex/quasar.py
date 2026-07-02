"""Client for the UNOFFICIAL Yandex Quasar API (iot.quasar.yandex.ru).

Used ONLY for scenario create/edit/delete, which the official public API
does not expose. Authenticates via a full browser session cookie + CSRF
token pasted by the user in Settings (see README for how to obtain them).

This API is not publicly documented and can change without notice (the
reference implementation is Home Assistant's AlexxIT/YandexStation
integration). Everything Yandex-schema-specific is isolated in this file so
a breaking change upstream doesn't affect devices/scenario-running, which
use the stable official API instead.
"""
from typing import Any

import httpx

from app import storage
from app.models import ScenarioAction, ScenarioDetail, ScenarioPayload, ScenarioTrigger
from app.yandex.errors import NotAuthenticatedError, UpstreamAuthError, YandexApiError

BASE_URL = "https://iot.quasar.yandex.ru"


class QuasarClient:
    def __init__(self, cookie: str, csrf_token: str | None):
        self._cookie = cookie
        self._csrf_token = csrf_token

    @classmethod
    async def from_storage(cls) -> "QuasarClient":
        values = await storage.get_all()
        cookie = values.get("quasar_cookie")
        if not cookie:
            raise NotAuthenticatedError(
                "Quasar-cookie не настроен. Добавьте его на странице Настройки, "
                "чтобы создавать и редактировать сценарии."
            )
        return cls(cookie, values.get("quasar_csrf_token"))

    def _headers(self) -> dict[str, str]:
        headers = {
            "Cookie": self._cookie,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (DFHome)",
        }
        if self._csrf_token:
            headers["x-csrf-token"] = self._csrf_token
        return headers

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict:
        url = f"{BASE_URL}{path}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.request(
                    method, url, headers=self._headers(), **kwargs
                )
            except httpx.RequestError as exc:
                raise YandexApiError(f"Не удалось связаться с Яндексом: {exc}") from exc

        if resp.status_code in (401, 403):
            raise UpstreamAuthError(
                "Яндекс отклонил cookie/csrf-токен (401/403). Обновите их в Настройках "
                "— значения из браузера периодически протухают.",
                status_code=resp.status_code,
            )
        if resp.status_code >= 400:
            raise YandexApiError(
                f"Ошибка Quasar API {resp.status_code}: {resp.text[:500]}",
                status_code=resp.status_code,
            )
        if not resp.content:
            return {}
        return resp.json()

    # -- read ---------------------------------------------------------

    async def list_scenarios(self) -> list[dict]:
        data = await self._request("GET", "/m/user/scenarios")
        return (data.get("scenarios") or data.get("data", {}).get("scenarios") or [])

    async def get_scenario(self, scenario_id: str) -> ScenarioDetail:
        raw = await self._request("GET", f"/m/v4/user/scenarios/{scenario_id}/edit")
        return parse_quasar_scenario(scenario_id, raw)

    # -- write ----------------------------------------------------------

    async def create_scenario(self, payload: ScenarioPayload) -> dict:
        body = build_quasar_payload(payload)
        return await self._request("POST", "/m/v4/user/scenarios", json=body)

    async def update_scenario(self, scenario_id: str, payload: ScenarioPayload) -> dict:
        body = build_quasar_payload(payload)
        return await self._request(
            "PUT", f"/m/v3/user/scenarios/{scenario_id}", json=body
        )

    async def delete_scenario(self, scenario_id: str) -> dict:
        return await self._request("DELETE", f"/m/user/scenarios/{scenario_id}")


# ---------------------------------------------------------------------------
# UI model <-> quasar payload translation
# ---------------------------------------------------------------------------

def _build_trigger(trigger: ScenarioTrigger) -> dict:
    if trigger.kind == "voice_phrase":
        return {"trigger": {"type": "scenario.trigger.voice", "value": trigger.phrase or ""}}
    if trigger.kind == "device_property":
        return {
            "trigger": {
                "type": "scenario.trigger.property",
                "value": {
                    "device_id": trigger.device_id,
                    "property_type": trigger.property_type,
                    "instance": trigger.property_instance,
                    "operator": trigger.operator,
                    "value": trigger.value,
                },
            }
        }
    if trigger.kind == "schedule":
        return {
            "trigger": {
                "type": "scenario.trigger.timetable",
                "value": {
                    "time": trigger.time_of_day,
                    "days": trigger.days_of_week or [],
                    "cron": trigger.cron,
                },
            }
        }
    raise ValueError(f"Unknown trigger kind: {trigger.kind}")


def _build_action_item(action: ScenarioAction) -> dict:
    if action.kind == "device_capability":
        return {
            "id": action.device_id,
            "type": "step.action.item.device",
            "value": {
                "id": action.device_id,
                "item_type": "device",
                "capabilities": [
                    {
                        "type": action.capability_type,
                        "state": {"instance": action.instance, "value": action.value},
                    }
                ],
            },
        }
    if action.kind == "tts":
        return {
            "type": "step.action.item.quasar",
            "value": {
                "item_type": "quasar",
                "capabilities": [
                    {
                        "type": "devices.capabilities.quasar",
                        "state": {"instance": "tts", "value": {"text": action.text}},
                    }
                ],
            },
        }
    if action.kind == "run_scenario":
        return {
            "type": "step.action.item.scenario",
            "value": {"item_type": "scenario", "launch_devices": [], "id": action.scenario_id},
        }
    raise ValueError(f"Unknown action kind: {action.kind}")


def build_quasar_payload(payload: ScenarioPayload) -> dict:
    return {
        "name": payload.name,
        "icon": payload.icon or "home",
        "triggers": [_build_trigger(t) for t in payload.triggers],
        "steps": [
            {
                "type": "scenarios.steps.actions.v2",
                "parameters": {"items": [_build_action_item(a) for a in payload.actions]},
            }
        ]
        if payload.actions
        else [],
    }


def _parse_trigger(raw: dict) -> ScenarioTrigger | None:
    """Best-effort reverse of _build_trigger. Returns None (rather than
    raising) for shapes we don't recognize, since this is an unofficial API
    and the exact schema isn't guaranteed to match what we send."""
    try:
        trigger = raw.get("trigger", raw)
        t_type = trigger.get("type", "")
        value = trigger.get("value")
        if t_type.endswith(".voice"):
            return ScenarioTrigger(kind="voice_phrase", phrase=value if isinstance(value, str) else None)
        if t_type.endswith(".property") and isinstance(value, dict):
            return ScenarioTrigger(
                kind="device_property",
                device_id=value.get("device_id"),
                property_type=value.get("property_type"),
                property_instance=value.get("instance"),
                operator=value.get("operator"),
                value=value.get("value"),
            )
        if t_type.endswith(".timetable") and isinstance(value, dict):
            return ScenarioTrigger(
                kind="schedule",
                time_of_day=value.get("time"),
                days_of_week=value.get("days"),
                cron=value.get("cron"),
            )
    except (AttributeError, TypeError):
        pass
    return None


def _parse_action_item(item: dict) -> ScenarioAction | None:
    """Best-effort reverse of _build_action_item. Returns None for anything
    that doesn't match a shape we recognize instead of guessing wrong."""
    try:
        item_type = item.get("type", "")
        value = item.get("value") or {}
        capabilities = value.get("capabilities") or []
        if item_type == "step.action.item.device" and capabilities:
            cap = capabilities[0]
            state = cap.get("state") or {}
            return ScenarioAction(
                kind="device_capability",
                device_id=value.get("id") or item.get("id"),
                capability_type=cap.get("type"),
                instance=state.get("instance"),
                value=state.get("value"),
            )
        if item_type == "step.action.item.quasar" and capabilities:
            state = capabilities[0].get("state") or {}
            text = (state.get("value") or {}).get("text") if isinstance(state.get("value"), dict) else None
            return ScenarioAction(kind="tts", text=text)
        if item_type == "step.action.item.scenario":
            return ScenarioAction(kind="run_scenario", scenario_id=value.get("id"))
    except (AttributeError, TypeError):
        pass
    return None


def parse_quasar_scenario(scenario_id: str, raw: dict) -> ScenarioDetail:
    """Parse a raw quasar scenario-edit response into our UI model.

    Unrecognized triggers/actions are silently dropped rather than raising,
    so editing an older/differently-shaped scenario still lets the user see
    the name and rebuild what didn't parse, instead of a hard failure.
    """
    data = raw.get("scenario", raw)
    triggers = [t for raw_t in data.get("triggers", []) if (t := _parse_trigger(raw_t)) is not None]

    actions: list[ScenarioAction] = []
    for step in data.get("steps", []):
        for item in (step.get("parameters") or {}).get("items", []):
            action = _parse_action_item(item)
            if action is not None:
                actions.append(action)

    return ScenarioDetail(
        id=scenario_id,
        name=data.get("name", scenario_id),
        icon=data.get("icon"),
        triggers=triggers,
        actions=actions,
    )
