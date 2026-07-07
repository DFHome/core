import * as React from "react";

import { api } from "@/lib/api";
import type { Room } from "@/lib/types";

export function useRooms() {
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      setRooms(await api.getRooms());
    } catch {
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createRoom = React.useCallback(
    async (body: { name: string; icon?: string }) => {
      const room = await api.createRoom(body);
      await refresh();
      return room;
    },
    [refresh],
  );

  const updateRoom = React.useCallback(
    async (id: string, body: { name: string; icon?: string }) => {
      const room = await api.updateRoom(id, body);
      await refresh();
      return room;
    },
    [refresh],
  );

  const deleteRoom = React.useCallback(
    async (id: string) => {
      await api.deleteRoom(id);
      await refresh();
    },
    [refresh],
  );

  return { rooms, isLoading, refresh, createRoom, updateRoom, deleteRoom };
}
