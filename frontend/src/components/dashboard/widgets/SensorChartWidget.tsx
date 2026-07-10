import * as React from "react";
import { LineChart } from "lucide-react";

import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeviceHistory, SensorChartWidget, WidgetSize } from "@/lib/types";

function windowHoursForSize(size: WidgetSize): number {
  return size === "l" ? 6 : 3;
}

export function SensorChartWidgetCard({
  widget,
  size,
}: {
  widget: SensorChartWidget;
  size: WidgetSize;
}) {
  const [history, setHistory] = React.useState<DeviceHistory | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void api
      .getDeviceHistory(widget.deviceId, windowHoursForSize(size))
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setHistory(null);
      });
    return () => {
      cancelled = true;
    };
  }, [widget.deviceId, size]);

  const points = history?.series[widget.propertyInstance] ?? [];
  const latest = history?.latest[widget.propertyInstance]?.value;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="text-muted-foreground size-4" />
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tabular-nums">
          {latest ?? "—"}
          {latest != null && widget.unit ? ` ${widget.unit}` : ""}
        </div>
        <div className="text-muted-foreground flex h-24 items-end gap-0.5">
          {points.length === 0 ? (
            <span className="text-xs">Нет данных за период</span>
          ) : (
            points.map((point) => {
              const values = points.map((p) => p.value);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const spread = max - min || 1;
              const height = ((point.value - min) / spread) * 100;
              return (
                <div
                  key={point.ts}
                  className="bg-primary/70 min-w-1 flex-1 rounded-sm"
                  style={{ height: `${Math.max(8, height)}%` }}
                />
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
