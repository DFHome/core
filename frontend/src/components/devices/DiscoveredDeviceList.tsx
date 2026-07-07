import { Check, Loader2 } from "lucide-react";

import { deviceTypeIcon } from "@/lib/device-icons";
import type { DeviceScanPhase, DiscoveredDevice } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type DiscoveredDeviceListProps = {
  devices: DiscoveredDevice[];
  phase: DeviceScanPhase | null;
};

function statusLabel(device: DiscoveredDevice, phase: DeviceScanPhase | null): string {
  if (device.status === "added") return "Добавлено";
  if (device.status === "configuring" || phase === "configuring") return "Настройка…";
  return "Найдено";
}

function statusVariant(
  device: DiscoveredDevice,
): "default" | "secondary" | "outline" {
  if (device.status === "added") return "default";
  if (device.status === "configuring") return "secondary";
  return "outline";
}

function DiscoveredDeviceItem({
  device,
  phase,
}: {
  device: DiscoveredDevice;
  phase: DeviceScanPhase | null;
}) {
  const Icon = deviceTypeIcon[device.type];
  const showProgress =
    device.status === "configuring" ||
    (phase === "complete" && device.status !== "added");

  return (
    <li
      className={cn(
        "animate-in fade-in-0 slide-in-from-right-6 rounded-lg border bg-background/80 p-3",
        "duration-500 ease-out fill-mode-both",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
          <Icon className="text-muted-foreground size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{device.name}</p>
            <Badge
              variant={statusVariant(device)}
              className="ml-auto shrink-0 gap-1 font-normal"
            >
              {device.status === "added" ? (
                <Check className="size-3" />
              ) : device.status === "configuring" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              {statusLabel(device, phase)}
            </Badge>
          </div>

          {showProgress && device.status !== "added" && (
            <Progress value={device.progress} className="gap-1.5">
              <ProgressLabel className="text-muted-foreground">
                Подключение
              </ProgressLabel>
              <ProgressValue />
            </Progress>
          )}
        </div>
      </div>
    </li>
  );
}

export function DiscoveredDeviceList({ devices, phase }: DiscoveredDeviceListProps) {
  const configuring = phase === "configuring" || phase === "complete";

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {configuring ? "Настройка устройств" : "Найденные устройства"}
        </p>
        <Badge variant="secondary" className="font-normal tabular-nums">
          {devices.length}
        </Badge>
      </div>

      <ul className="space-y-2">
        {devices.map((device) => (
          <DiscoveredDeviceItem key={device.id} device={device} phase={phase} />
        ))}
      </ul>
    </div>
  );
}
