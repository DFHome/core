import * as React from "react";
import { Radar } from "lucide-react";

import type { DeviceScanPhase, DiscoveredDevice, RadarBlip } from "@/lib/types";
import { DeviceRadar } from "@/components/devices/DeviceRadar";
import { DiscoveredDeviceList } from "@/components/devices/DiscoveredDeviceList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RADAR_COLUMN_WIDTH = 280;

type ScanControlButtonProps = {
  scanning: boolean;
  onStart: () => void;
  onCancel: () => void;
};

function ScanControlButton({ scanning, onStart, onCancel }: ScanControlButtonProps) {
  const label = scanning ? "Отменить" : "Начать сканирование";
  const mirrorRef = React.useRef<HTMLSpanElement>(null);
  const [width, setWidth] = React.useState<number | undefined>(undefined);

  React.useLayoutEffect(() => {
    const next = mirrorRef.current?.offsetWidth;
    if (next) {
      setWidth(next);
    }
  }, [label]);

  return (
    <div className="relative inline-flex shrink-0">
      <span
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 inline-flex h-7 items-center px-2 text-xs/relaxed font-medium whitespace-nowrap"
      >
        {label}
      </span>
      <Button
        type="button"
        variant={scanning ? "outline" : "default"}
        size="default"
        className="overflow-hidden transition-[width] duration-300 ease-in-out"
        style={width ? { width } : undefined}
        onClick={scanning ? onCancel : onStart}
      >
        {label}
      </Button>
    </div>
  );
}

type DeviceScanPanelProps = {
  blips?: RadarBlip[];
  devices: DiscoveredDevice[];
  open: boolean;
  phase: DeviceScanPhase | null;
  scanning: boolean;
  countdownLabel: string;
  onStartScan: () => void;
  onCancelScan: () => void;
};

export function DeviceScanPanel({
  blips = [],
  devices,
  open,
  phase,
  scanning,
  countdownLabel,
  onStartScan,
  onCancelScan,
}: DeviceScanPanelProps) {
  const configuring = phase === "configuring" || phase === "complete";
  const showEmptyComplete = phase === "complete" && devices.length === 0;

  return (
    <Card className="overflow-hidden bg-card/70">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Radar className="text-muted-foreground size-4" />
            </div>
            <div className="space-y-0.5">
              <p className="font-medium">Новое устройство?</p>
              <p className="text-muted-foreground text-sm">
                {configuring
                  ? "Подключаем найденные устройства к DFHome."
                  : "Запустите поиск, чтобы найти и подключить устройство поблизости."}
              </p>
            </div>
          </div>

          {!open && (
            <ScanControlButton
              scanning={false}
              onStart={onStartScan}
              onCancel={onCancelScan}
            />
          )}
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
            open ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            {showEmptyComplete ? (
              <p className="text-muted-foreground pb-1 text-center text-sm">
                Устройства не найдены. Попробуйте снова.
              </p>
            ) : (
              <div className="flex items-start gap-6 pb-1">
                <div
                  className="flex shrink-0 flex-col items-start gap-3"
                  style={{ width: RADAR_COLUMN_WIDTH }}
                >
                  <DeviceRadar blips={blips} scanning={scanning} />

                  {(scanning || configuring) && (
                    <div className="flex w-full flex-col items-start gap-2">
                      {scanning && (
                        <p className="text-muted-foreground text-sm tabular-nums">
                          Осталось{" "}
                          <span className="text-foreground font-medium">
                            {countdownLabel}
                          </span>
                        </p>
                      )}
                      {phase === "complete" && devices.length > 0 && (
                        <p className="text-sm font-medium text-primary">
                          Все устройства добавлены
                        </p>
                      )}
                      {scanning && (
                        <ScanControlButton
                          scanning
                          onStart={onStartScan}
                          onCancel={onCancelScan}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <DiscoveredDeviceList devices={devices} phase={phase} />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
