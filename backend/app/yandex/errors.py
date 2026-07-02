"""Shared exception types for the Yandex client layer.

Routers catch these and translate them into clean HTTP responses instead of
leaking raw httpx tracebacks to the frontend.
"""


class YandexApiError(Exception):
    """Base error for anything that goes wrong talking to Yandex."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotAuthenticatedError(YandexApiError):
    """Raised when the required token/cookie hasn't been configured yet."""


class UpstreamAuthError(YandexApiError):
    """Raised when Yandex itself rejects the token/cookie (401/403)."""
