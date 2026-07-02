import type { DeviceView, ScenarioAction, ScenarioTrigger, TriggerKind } from "../api/types";

// -- Triggers ---------------------------------------------------------------

interface TriggerEditorProps {
  trigger: ScenarioTrigger;
  devices: DeviceView[];
  onChange: (trigger: ScenarioTrigger) => void;
  onRemove: () => void;
}

const TRIGGER_KINDS: { value: TriggerKind; label: string }[] = [
  { value: "voice_phrase", label: "Голосовая фраза" },
  { value: "device_property", label: "Изменение свойства устройства" },
  { value: "schedule", label: "Расписание" },
];

export function TriggerEditor({ trigger, devices, onChange, onRemove }: TriggerEditorProps) {
  const set = (patch: Partial<ScenarioTrigger>) => onChange({ ...trigger, ...patch });

  return (
    <div className="trigger-block">
      <button type="button" className="remove-btn" onClick={onRemove} title="Удалить условие">
        ×
      </button>
      <div className="form-field">
        <label>Тип условия</label>
        <select value={trigger.kind} onChange={(e) => set({ kind: e.target.value as TriggerKind })}>
          {TRIGGER_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {trigger.kind === "voice_phrase" && (
        <div className="form-field">
          <label>Фраза</label>
          <input
            type="text"
            placeholder="включи вечер"
            value={trigger.phrase ?? ""}
            onChange={(e) => set({ phrase: e.target.value })}
          />
        </div>
      )}

      {trigger.kind === "device_property" && (
        <>
          <div className="form-field">
            <label>Устройство</label>
            <select value={trigger.device_id ?? ""} onChange={(e) => set({ device_id: e.target.value })}>
              <option value="">— выберите —</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Свойство (instance)</label>
            <input
              type="text"
              placeholder="temperature"
              value={trigger.property_instance ?? ""}
              onChange={(e) => set({ property_instance: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Условие</label>
            <select value={trigger.operator ?? "eq"} onChange={(e) => set({ operator: e.target.value as ScenarioTrigger["operator"] })}>
              <option value="eq">равно</option>
              <option value="gt">больше</option>
              <option value="gte">больше или равно</option>
              <option value="lt">меньше</option>
              <option value="lte">меньше или равно</option>
            </select>
          </div>
          <div className="form-field">
            <label>Значение</label>
            <input
              type="text"
              value={String(trigger.value ?? "")}
              onChange={(e) => set({ value: e.target.value })}
            />
          </div>
        </>
      )}

      {trigger.kind === "schedule" && (
        <div className="form-field">
          <label>Время (ЧЧ:ММ)</label>
          <input
            type="time"
            value={trigger.time_of_day ?? ""}
            onChange={(e) => set({ time_of_day: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// -- Actions ------------------------------------------------------------

interface ActionEditorProps {
  action: ScenarioAction;
  devices: DeviceView[];
  onChange: (action: ScenarioAction) => void;
  onRemove: () => void;
}

export function ActionEditor({ action, devices, onChange, onRemove }: ActionEditorProps) {
  const set = (patch: Partial<ScenarioAction>) => onChange({ ...action, ...patch });
  const selectedDevice = devices.find((d) => d.id === action.device_id);

  return (
    <div className="action-block">
      <button type="button" className="remove-btn" onClick={onRemove} title="Удалить действие">
        ×
      </button>
      <div className="form-field">
        <label>Тип действия</label>
        <select value={action.kind} onChange={(e) => set({ kind: e.target.value as ScenarioAction["kind"] })}>
          <option value="device_capability">Управление устройством</option>
          <option value="tts">Сказать фразу (TTS)</option>
          <option value="run_scenario">Запустить другой сценарий</option>
        </select>
      </div>

      {action.kind === "device_capability" && (
        <>
          <div className="form-field">
            <label>Устройство</label>
            <select
              value={action.device_id ?? ""}
              onChange={(e) => set({ device_id: e.target.value, capability_type: "", instance: "" })}
            >
              <option value="">— выберите —</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {selectedDevice && (
            <div className="form-field">
              <label>Функция</label>
              <select
                value={`${action.capability_type ?? ""}:${action.instance ?? ""}`}
                onChange={(e) => {
                  const [capability_type, instance] = e.target.value.split(":");
                  set({ capability_type, instance });
                }}
              >
                <option value=":">— выберите —</option>
                {selectedDevice.controls.map((c) => (
                  <option key={`${c.capability_type}:${c.instance}`} value={`${c.capability_type}:${c.instance}`}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-field">
            <label>Значение</label>
            <input
              type="text"
              placeholder="true / 50 / eco"
              value={String(action.value ?? "")}
              onChange={(e) => set({ value: e.target.value })}
            />
          </div>
        </>
      )}

      {action.kind === "tts" && (
        <div className="form-field">
          <label>Текст фразы</label>
          <input
            type="text"
            placeholder="Добрый вечер!"
            value={action.text ?? ""}
            onChange={(e) => set({ text: e.target.value })}
          />
        </div>
      )}

      {action.kind === "run_scenario" && (
        <div className="form-field">
          <label>ID сценария</label>
          <input
            type="text"
            value={action.scenario_id ?? ""}
            onChange={(e) => set({ scenario_id: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
