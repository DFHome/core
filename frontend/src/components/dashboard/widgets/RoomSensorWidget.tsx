import { Activity } from "lucide-react";

import { useDevices } from "@/hooks/use-devices";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RoomSensorWidget } from "@/lib/types";

export function RoomSensorWidgetCard({ widget }: { widget: RoomSensorWidget }) {
  const { getDevice } = useDevices();
  const device = getDevice(widget.deviceId);
  const property = device?.entities
    .flatMap((entity) => entity.properties)
    .find((item) => item.instance === widget.propertyInstance);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="text-muted-foreground size-4" />
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-xs">{widget.label}</div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">
          {property?.value ?? "—"}
          {property?.value != null && property.unit ? ` ${property.unit}` : ""}
        </div>
      </CardContent>
    </Card>
  );
}
