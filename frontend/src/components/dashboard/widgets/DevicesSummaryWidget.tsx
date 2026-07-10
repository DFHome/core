import { Cpu } from "lucide-react";

import { devicesSummary } from "@/lib/device-utils";
import { useDevices } from "@/hooks/use-devices";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DevicesSummaryWidget } from "@/lib/types";

export function DevicesSummaryWidgetCard({
  widget,
}: {
  widget: DevicesSummaryWidget;
}) {
  const { devices } = useDevices();
  const summary = devicesSummary(devices);
  const stats = [
    { label: "Всего", value: summary.total },
    { label: "Онлайн", value: summary.online },
    { label: "Активны", value: summary.active },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="text-muted-foreground size-4" />
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-md bg-muted/50 p-3 text-center"
            >
              <div className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
