import { deviceTypeIcon } from "@/lib/device-icons";
import type { RadarBlip } from "@/lib/types";
import { cn } from "@/lib/utils";

const RADAR_SIZE = 280;
const BLIP_RADIUS = (RADAR_SIZE / 2) * 0.88;

type RadarBlipMarkerProps = {
  blip: RadarBlip;
};

function RadarBlipMarker({ blip }: RadarBlipMarkerProps) {
  const Icon = deviceTypeIcon[blip.type];
  const radians = ((blip.bearing - 90) * Math.PI) / 180;
  const radius = blip.distance * BLIP_RADIUS;
  const x = RADAR_SIZE / 2 + Math.cos(radians) * radius;
  const y = RADAR_SIZE / 2 + Math.sin(radians) * radius;

  return (
    <div
      className="absolute z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center"
      style={{ left: x, top: y }}
    >
      <div className="flex size-8 items-center justify-center rounded-full border border-border/80 bg-popover text-foreground shadow-md">
        <Icon className="size-3.5" />
      </div>
      <span className="max-w-16 truncate rounded bg-background/80 px-1 py-0.5 text-[9px] text-foreground shadow-sm backdrop-blur">
        {blip.name}
      </span>
    </div>
  );
}

type DeviceRadarProps = {
  blips?: RadarBlip[];
  scanning: boolean;
};

export function DeviceRadar({ blips = [], scanning }: DeviceRadarProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-border bg-background shadow-inner"
      style={{ width: RADAR_SIZE, height: RADAR_SIZE }}
    >
      <div className="absolute inset-0 rounded-full bg-primary/[0.03]" />

      {[0.33, 0.66, 1].map((scale) => (
        <div
          key={scale}
          className="pointer-events-none absolute rounded-full border border-border/40"
          style={{
            inset: `${((1 - scale) / 2) * 100}%`,
          }}
        />
      ))}

      <div className="pointer-events-none absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70" />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 origin-center rounded-full",
          scanning ? "animate-[radar-sweep_2.4s_linear_infinite]" : "",
        )}
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklch, var(--primary), transparent 55%) 28deg, transparent 56deg)",
        }}
      />

      {blips.map((blip) => (
        <RadarBlipMarker key={blip.id} blip={blip} />
      ))}
    </div>
  );
}
