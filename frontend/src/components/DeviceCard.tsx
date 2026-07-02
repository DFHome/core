import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiErrorMessage, endpoints } from "../api/client";
import type { ControlSpec, DeviceView } from "../api/types";
import ColorControl from "./controls/ColorControl";
import ModeSelect from "./controls/ModeSelect";
import SliderControl from "./controls/SliderControl";
import SwitchControl from "./controls/SwitchControl";

interface Props {
  device: DeviceView;
}

export default function DeviceCard({ device }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: { control: ControlSpec; value: unknown }) =>
      endpoints.deviceAction(
        device.id,
        params.control.capability_type,
        params.control.instance,
        params.value,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["device", device.id] });
    },
  });

  const renderControl = (control: ControlSpec) => {
    const disabled = mutation.isPending || !device.online;
    switch (control.kind) {
      case "switch":
        return (
          <SwitchControl
            checked={Boolean(control.value)}
            disabled={disabled}
            onChange={(value) => mutation.mutate({ control, value })}
          />
        );
      case "slider":
        return (
          <SliderControl
            value={Number(control.value) || 0}
            min={control.min ?? 0}
            max={control.max ?? 100}
            step={control.precision ?? 1}
            unit={control.unit}
            disabled={disabled}
            onChange={(value) => mutation.mutate({ control, value })}
          />
        );
      case "mode":
        return (
          <ModeSelect
            value={String(control.value ?? "")}
            options={control.options ?? []}
            disabled={disabled}
            onChange={(value) => mutation.mutate({ control, value })}
          />
        );
      case "color":
        return (
          <ColorControl
            value={control.value}
            colorModel={control.color_model}
            disabled={disabled}
            onChange={(value) => mutation.mutate({ control, value })}
          />
        );
      default:
        return <span style={{ fontSize: 12, color: "#aaa" }}>не поддерживается</span>;
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h3>
            <Link to={`/devices/${device.id}`}>{device.name}</Link>
          </h3>
          <div className="subtitle">{device.type.replace("devices.types.", "")}</div>
        </div>
        {!device.online && <span className="offline-badge">офлайн</span>}
      </div>

      {device.controls.map((control) => (
        <div className="control-row" key={`${control.capability_type}:${control.instance}`}>
          <label>{control.label}</label>
          {renderControl(control)}
        </div>
      ))}

      {device.properties.map((prop) => (
        <div className="property-row" key={`${prop.property_type}:${prop.instance}`}>
          <span>{prop.label}</span>
          <span>
            {String(prop.value)}
            {prop.unit || ""}
          </span>
        </div>
      ))}

      {mutation.isError && (
        <div className="banner error" style={{ marginTop: 8, marginBottom: 0 }}>
          {apiErrorMessage(mutation.error)}
        </div>
      )}
    </div>
  );
}
