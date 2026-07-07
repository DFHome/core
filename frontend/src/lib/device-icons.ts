import {
  Lightbulb,
  Plug,
  Radio,
  Speaker,
  Thermometer,
  ToggleLeft,
} from "lucide-react";

import type { DeviceType } from "./types";

export const deviceTypeIcon: Record<
  DeviceType,
  React.ComponentType<{ className?: string }>
> = {
  light: Lightbulb,
  socket: Plug,
  switch: ToggleLeft,
  sensor: Thermometer,
  thermostat: Thermometer,
  media_device: Speaker,
  other: Radio,
};
