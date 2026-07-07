import * as React from "react";

import { api, openDeviceSocket } from "@/lib/api";
import type {
  DeviceScanPhase,
  DiscoveredDevice,
  RadarBlip,
  ScanWsEvent,
} from "@/lib/types";

const AUTO_CLOSE_MS = 2_500;

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function applyScanEvent(
  event: ScanWsEvent,
  setPhase: React.Dispatch<React.SetStateAction<DeviceScanPhase | null>>,
  setRemainingSeconds: React.Dispatch<React.SetStateAction<number>>,
  setDevices: React.Dispatch<React.SetStateAction<DiscoveredDevice[]>>,
) {
  switch (event.kind) {
    case "started":
      setPhase("scanning");
      setRemainingSeconds(event.remainingSeconds ?? 0);
      setDevices([]);
      break;
    case "tick":
      setPhase("scanning");
      if (event.remainingSeconds != null) {
        setRemainingSeconds(event.remainingSeconds);
      }
      break;
    case "discovered":
      if (event.device) {
        setDevices((prev) =>
          prev.some((item) => item.id === event.device!.id)
            ? prev
            : [...prev, event.device!],
        );
      }
      break;
    case "finished":
      setPhase("configuring");
      break;
    case "progress":
      if (event.device) {
        setPhase("configuring");
        setDevices((prev) =>
          prev.map((item) => (item.id === event.device!.id ? event.device! : item)),
        );
      } else if (event.deviceId != null && event.progress != null) {
        setPhase("configuring");
        setDevices((prev) =>
          prev.map((item) =>
            item.id === event.deviceId
              ? {
                  ...item,
                  status: "configuring",
                  progress: event.progress!,
                }
              : item,
          ),
        );
      }
      break;
    case "added":
      if (event.device) {
        setDevices((prev) =>
          prev.map((item) => (item.id === event.device!.id ? event.device! : item)),
        );
      } else if (event.deviceId) {
        setDevices((prev) =>
          prev.map((item) =>
            item.id === event.deviceId
              ? { ...item, status: "added", progress: 100 }
              : item,
          ),
        );
      }
      break;
    case "complete":
      setPhase("complete");
      break;
    case "cancelled":
      setPhase(null);
      setRemainingSeconds(0);
      setDevices([]);
      break;
  }
}

export function useDeviceScan() {
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<DeviceScanPhase | null>(null);
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);
  const [devices, setDevices] = React.useState<DiscoveredDevice[]>([]);

  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const reset = React.useCallback(() => {
    clearCloseTimer();
    setOpen(false);
    setPhase(null);
    setRemainingSeconds(0);
    setDevices([]);
  }, [clearCloseTimer]);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      reset();
    }, AUTO_CLOSE_MS);
  }, [clearCloseTimer, reset]);

  React.useEffect(() => {
    const closeSocket = openDeviceSocket((message) => {
      if (message.type !== "device_scan") {
        return;
      }

      applyScanEvent(message.scan, setPhase, setRemainingSeconds, setDevices);

      if (message.scan.kind === "complete") {
        scheduleClose();
      }
      if (message.scan.kind === "cancelled") {
        reset();
      }
    });

    return () => {
      closeSocket();
      clearCloseTimer();
    };
  }, [clearCloseTimer, reset, scheduleClose]);

  const startScan = React.useCallback(async () => {
    clearCloseTimer();
    setOpen(true);
    setPhase("scanning");
    setDevices([]);
    try {
      await api.startDeviceScan();
    } catch {
      reset();
    }
  }, [clearCloseTimer, reset]);

  const cancelScan = React.useCallback(async () => {
    try {
      await api.cancelDeviceScan();
    } finally {
      reset();
    }
  }, [reset]);

  const blips: RadarBlip[] = devices.map(({ id, name, type, bearing, distance }) => ({
    id,
    name,
    type,
    bearing,
    distance,
  }));

  const scanning = phase === "scanning";
  const hasDevices = devices.length > 0;

  return {
    open,
    phase,
    scanning,
    hasDevices,
    remainingSeconds,
    countdownLabel: formatCountdown(remainingSeconds),
    devices,
    blips,
    startScan,
    cancelScan,
  };
}
