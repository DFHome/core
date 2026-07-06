"""Client for the official Yandex Smart Home API (api.iot.yandex.net).

Handles: listing homes/rooms/devices/scenarios, reading device state,
controlling devices, and *running* (not creating) scenarios.

Docs: https://yandex.ru/dev/dialogs/smart-home/doc/en/concepts/platform-user-info
"""
from typing import Any

import httpx

from app import storage
from app.yandex.errors import NotAuthenticatedError, UpstreamAuthError, YandexApiError

BASE_URL = "https://api.iot.yandex.net/v1.0"


class OfficialClient:
    def __init__(self, token: str):
        self._token = token

    @classmethod
    async def from_storage(cls) -> "OfficialClient":
        token = await storage.get("yandex_oauth_token")
        if not token:
            raise NotAuthenticatedError(
                "OAuth-токен не настроен. Добавьте его на странице Настройки."
            )
        return cls(token)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

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
                "Яндекс отклонил OAuth-токен (401/403). Проверьте токен в Настройках.",
                status_code=resp.status_code,
            )
        if resp.status_code >= 400:
            raise YandexApiError(
                f"Ошибка Yandex API {resp.status_code}: {resp.text[:500]}",
                status_code=resp.status_code,
            )
        if not resp.content:
            return {}
        return resp.json()

    async def get_user_info(self) -> dict:
        return await self._request("GET", "/user/info")

    async def get_device(self, device_id: str) -> dict:
        return await self._request("GET", f"/devices/{device_id}")

    async def device_action(
        self, device_id: str, capability_type: str, instance: str, value: Any
    ) -> dict:
        body = {
            "devices": [
                {
                    "id": device_id,
                    "actions": [
                        {
                            "type": capability_type,
                            "state": {"instance": instance, "value": value},
                        }
                    ],
                }
            ]
        }
        return await self._request("POST", "/devices/actions", json=body)

    async def run_scenario(self, scenario_id: str) -> dict:
        return await self._request("POST", f"/scenarios/{scenario_id}/actions", json={})
