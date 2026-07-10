import * as React from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";

import { useDevices } from "@/hooks/use-devices";
import { usePlanLayout } from "@/hooks/use-plan-layout";
import { useRooms } from "@/hooks/use-rooms";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { PlanDevicePosition, PlanRoom } from "@/lib/types";
import { DevicePlanInspector } from "@/components/plan/DevicePlanInspector";
import { PlanCanvas } from "@/components/plan/PlanCanvas";
import { PLAN_HEIGHT, PLAN_WIDTH } from "@/components/plan/plan-utils";
import { PlanToolbar } from "@/components/plan/PlanToolbar";
import { Button } from "@/components/ui/button";

const EDGE = 24;

function clampRoom(room: PlanRoom): PlanRoom {
  const width = Math.min(room.width, PLAN_WIDTH - EDGE * 2);
  const height = Math.min(room.height, PLAN_HEIGHT - EDGE * 2);

  return {
    ...room,
    width,
    height,
    x: Math.min(Math.max(EDGE, room.x), PLAN_WIDTH - width - EDGE),
    y: Math.min(Math.max(EDGE, room.y), PLAN_HEIGHT - height - EDGE),
  };
}

function clampDevice(position: PlanDevicePosition): PlanDevicePosition {
  return {
    ...position,
    x: Math.min(Math.max(EDGE, position.x), PLAN_WIDTH - EDGE),
    y: Math.min(Math.max(EDGE, position.y), PLAN_HEIGHT - EDGE),
  };
}

export default function Plan() {
  const { devices, updateCapability } = useDevices();
  const { rooms, createRoom, updateRoom, refresh: refreshRooms } = useRooms();
  const { layout, setLayout, save, reset, discardChanges, isLoading, isDirty } = usePlanLayout();
  const { setGuard } = useUnsavedChangesGuard();
  const [editable, setEditable] = React.useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId);
  const selectedPosition = layout.devices.find(
    (position) => position.deviceId === selectedDeviceId,
  );

  const isPlanEmpty = layout.rooms.length === 0 && layout.devices.length === 0;
  const hasSuggestedContent = rooms.length > 0 || devices.length > 0;

  const availableDevices = devices.filter(
    (device) =>
      !layout.devices.some((position) => position.deviceId === device.id),
  );

  const planRoomIds = React.useMemo(
    () => new Set(layout.rooms.map((room) => room.roomId)),
    [layout.rooms],
  );
  const visibleRooms = React.useMemo(
    () => rooms.filter((room) => planRoomIds.has(room.id)),
    [rooms, planRoomIds],
  );

  const handleSave = React.useCallback(async (): Promise<boolean> => {
    try {
      await save();
      await refreshRooms();
      toast.success("План сохранён");
      return true;
    } catch {
      toast.error("Не удалось сохранить план");
      return false;
    }
  }, [refreshRooms, save]);

  const handleDiscard = React.useCallback(() => {
    discardChanges();
    void refreshRooms();
    setSelectedDeviceId(null);
  }, [discardChanges, refreshRooms]);

  React.useEffect(() => {
    if (!editable || !isDirty) {
      setGuard(null);
      return;
    }
    setGuard({ isDirty, save: handleSave, discard: handleDiscard });
    return () => setGuard(null);
  }, [editable, handleDiscard, handleSave, isDirty, setGuard]);

  const updatePlanRoom = (updated: PlanRoom) => {
    setLayout((current) => ({
      ...current,
      rooms: current.rooms.map((room) =>
        room.roomId === updated.roomId ? clampRoom(updated) : room,
      ),
    }));
  };

  const removeRoom = (roomId: string) => {
    setLayout((current) => ({
      rooms: current.rooms.filter((room) => room.roomId !== roomId),
      devices: current.devices.map((position) =>
        position.attachedRoomId === roomId
          ? { ...position, visualKind: "bulb", attachedRoomId: null }
          : position,
      ),
    }));
  };

  const addRoom = (roomId: string) => {
    const offset = (layout.rooms.length % 6) * 24;
    setLayout((current) => ({
      ...current,
      rooms: [
        ...current.rooms,
        clampRoom({
          roomId,
          x: 48 + offset,
          y: 48 + offset,
          width: 240,
          height: 168,
        }),
      ],
    }));
  };

  const handleCreateRoom = async () => {
    try {
      const created = await createRoom({
        name: `Комната ${layout.rooms.length + 1}`,
      });
      addRoom(created.id);
    } catch {
      toast.error("Не удалось создать комнату");
    }
  };

  const handleRenameRoom = async (roomId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    try {
      await updateRoom(roomId, { name: trimmed });
    } catch {
      toast.error("Не удалось переименовать комнату");
    }
  };

  const updateDevice = (updated: PlanDevicePosition) => {
    setLayout((current) => ({
      ...current,
      devices: current.devices.map((position) =>
        position.deviceId === updated.deviceId ? clampDevice(updated) : position,
      ),
    }));
  };

  const removeDevice = (deviceId: string) => {
    setLayout((current) => ({
      ...current,
      devices: current.devices.filter((position) => position.deviceId !== deviceId),
    }));
    setSelectedDeviceId((current) => (current === deviceId ? null : current));
  };

  const addDevice = (deviceId: string) => {
    const offset = (layout.devices.length % 8) * 24;
    const device = devices.find((item) => item.id === deviceId);
    const room = layout.rooms.find((planRoom) => planRoom.roomId === device?.roomId);

    const position = clampDevice({
      deviceId,
      x: room ? room.x + room.width / 2 : 96 + offset,
      y: room ? room.y + room.height / 2 : 96 + offset,
      visualKind: "bulb",
      attachedRoomId: null,
    });

    setLayout((current) => ({
      ...current,
      devices: [...current.devices, position],
    }));
    setSelectedDeviceId(deviceId);
  };

  const makeStrip = (deviceId: string, roomId: string) => {
    setLayout((current) => ({
      ...current,
      devices: current.devices.map((position) =>
        position.deviceId === deviceId
          ? { ...position, visualKind: "strip", attachedRoomId: roomId }
          : position,
      ),
    }));
    setSelectedDeviceId(deviceId);
  };

  const handleReset = async () => {
    try {
      await reset();
      await refreshRooms();
      setSelectedDeviceId(null);
      toast.info(
        hasSuggestedContent
          ? "План сброшен к раскладке интеграций"
          : "План очищен",
      );
    } catch {
      toast.error("Не удалось сбросить план");
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Загрузка плана…</p>;
  }

  if (isPlanEmpty && !editable) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Package className="text-muted-foreground size-12" />
        <div className="space-y-1">
          <p className="font-medium">План дома пуст</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Создайте комнаты и расставьте их на визуальном плане.
          </p>
        </div>
        <Button type="button" onClick={() => setEditable(true)}>
          Создать план дома
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Визуальный план дома: комнаты рисуются прямоугольниками, устройства
          ставятся маркерами, а источник света можно превратить в ленту по
          периметру комнаты.
        </p>
        <PlanToolbar
          editable={editable}
          availableDevices={availableDevices}
          onEditableChange={setEditable}
          onCreateRoom={() => void handleCreateRoom()}
          onAddDevice={addDevice}
          onSave={() => void handleSave()}
          onReset={() => void handleReset()}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PlanCanvas
          rooms={visibleRooms}
          devices={devices}
          layout={layout}
          editable={editable}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onChangeRoom={updatePlanRoom}
          onRemoveRoom={removeRoom}
          onRenameRoom={(roomId, name) => void handleRenameRoom(roomId, name)}
          onChangeDevice={updateDevice}
          onRemoveDevice={removeDevice}
          onMakeStrip={makeStrip}
        />
        <DevicePlanInspector
          device={selectedDevice}
          position={selectedPosition}
          rooms={visibleRooms}
          planRooms={layout.rooms}
          onChange={updateDevice}
          onCapabilityChange={updateCapability}
          onClear={() => setSelectedDeviceId(null)}
        />
      </div>
    </div>
  );
}
