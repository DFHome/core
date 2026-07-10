import type { Widget } from "@/lib/types";
import { displayWidgetSize } from "@/components/dashboard/widget-grid-utils";
import { DevicesSummaryWidgetCard } from "@/components/dashboard/widgets/DevicesSummaryWidget";
import { PlanWidgetCard } from "@/components/dashboard/widgets/PlanWidget";
import { RoomSensorWidgetCard } from "@/components/dashboard/widgets/RoomSensorWidget";
import { SensorChartWidgetCard } from "@/components/dashboard/widgets/SensorChartWidget";
import { StationWidgetCard } from "@/components/dashboard/widgets/StationWidget";
import { WeatherWidgetCard } from "@/components/dashboard/widgets/WeatherWidget";

export function renderWidget(widget: Widget) {
  const size = displayWidgetSize(widget);
  switch (widget.kind) {
    case "plan":
      return <PlanWidgetCard widget={widget} />;
    case "devices_summary":
      return <DevicesSummaryWidgetCard widget={widget} />;
    case "room_sensor":
      return <RoomSensorWidgetCard widget={widget} />;
    case "sensor_chart":
      return <SensorChartWidgetCard widget={widget} size={size} />;
    case "weather":
      return <WeatherWidgetCard widget={widget} size={size} />;
    case "station":
      return <StationWidgetCard widget={widget} />;
  }
}
