import * as React from "react";
import { Cloud, Droplets, Wind } from "lucide-react";

import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WeatherData, WeatherWidget, WidgetSize } from "@/lib/types";

export function WeatherWidgetCard({
  widget,
  size,
}: {
  widget: WeatherWidget;
  size: WidgetSize;
}) {
  const [data, setData] = React.useState<WeatherData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void api
      .getWeather(widget.query)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [widget.query]);

  const compact = size === "s";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{widget.query}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {!error && !data && (
          <p className="text-muted-foreground text-sm">Загрузка…</p>
        )}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Cloud className="text-muted-foreground size-10" />
              <div className="text-3xl font-semibold tabular-nums">
                {data.temperature != null ? Math.round(data.temperature) : "—"}°
              </div>
            </div>
            {!compact && (
              <div className="text-muted-foreground flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Droplets className="size-4" /> {data.humidity ?? "—"}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="size-4" /> {data.windSpeed ?? "—"} км/ч
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
