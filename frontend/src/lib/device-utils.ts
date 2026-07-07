import type { Device, Room } from "./types";

export function updateDeviceCapability(
  devices: Device[],
  deviceId: string,
  entityId: string,
  instance: string,
  value: unknown,
): Device[] {
  return devices.map((device) =>
    device.id === deviceId
      ? {
          ...device,
          entities: device.entities.map((entity) =>
            entity.id === entityId
              ? {
                  ...entity,
                  capabilities: entity.capabilities.map((capability) =>
                    capability.instance === instance
                      ? { ...capability, value }
                      : capability,
                  ),
                }
              : entity,
          ),
        }
      : device,
  );
}

export function devicesSummary(devices: Device[]) {
  return {
    total: devices.length,
    online: devices.filter((device) => device.online).length,
    active: devices.filter((device) =>
      device.entities.some((entity) =>
        entity.capabilities.some(
          (capability) => capability.instance === "on" && capability.value === true,
        ),
      ),
    ).length,
  };
}

export const UNASSIGNED_ROOM_ID = "__unassigned__";

export function groupDevicesForDisplay(rooms: Room[], devices: Device[]) {
  const roomIds = new Set(rooms.map((room) => room.id));
  const grouped = rooms
    .map((room) => ({
      room,
      devices: devices.filter((device) => device.roomId === room.id),
    }))
    .filter((entry) => entry.devices.length > 0);

  const unassigned = devices.filter(
    (device) => !device.roomId || !roomIds.has(device.roomId),
  );

  if (unassigned.length > 0) {
    grouped.push({
      room: { id: UNASSIGNED_ROOM_ID, name: "Без комнаты" },
      devices: unassigned,
    });
  }

  return grouped;
}

/** @deprecated Use groupDevicesForDisplay */
export function devicesByRoom(rooms: Room[], devices: Device[]) {
  return groupDevicesForDisplay(rooms, devices);
}
