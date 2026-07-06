from fastapi import APIRouter

from app.models import ScenarioDetail, ScenarioPayload, ScenarioSummary
from app.yandex.official import OfficialClient
from app.yandex.quasar import QuasarClient

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioSummary])
async def list_scenarios() -> list[ScenarioSummary]:
    """List scenarios via the official API (stable, read-only)."""
    client = await OfficialClient.from_storage()
    data = await client.get_user_info()
    return [
        ScenarioSummary(id=s["id"], name=s.get("name", s["id"]), icon=s.get("icon"))
        for s in data.get("scenarios", [])
    ]


@router.post("/{scenario_id}/run")
async def run_scenario(scenario_id: str) -> dict:
    client = await OfficialClient.from_storage()
    await client.run_scenario(scenario_id)
    return {"status": "ok"}


@router.post("")
async def create_scenario(payload: ScenarioPayload) -> dict:
    """Create a scenario via the unofficial quasar API (official API can't)."""
    quasar = await QuasarClient.from_storage()
    return await quasar.create_scenario(payload)


@router.put("/{scenario_id}")
async def update_scenario(scenario_id: str, payload: ScenarioPayload) -> dict:
    quasar = await QuasarClient.from_storage()
    return await quasar.update_scenario(scenario_id, payload)


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: str) -> dict:
    quasar = await QuasarClient.from_storage()
    return await quasar.delete_scenario(scenario_id)


@router.get("/{scenario_id}/edit", response_model=ScenarioDetail)
async def get_scenario_for_edit(scenario_id: str) -> ScenarioDetail:
    """Parsed scenario detail used to pre-fill the edit form. Triggers/actions
    that don't match a recognized shape are dropped (see quasar.py) rather
    than failing the whole request, since this API is unofficial."""
    quasar = await QuasarClient.from_storage()
    return await quasar.get_scenario(scenario_id)
