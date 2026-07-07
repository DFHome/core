import * as React from "react";
import { Pencil, X } from "lucide-react";

import { usePlanDrag } from "@/hooks/use-plan-drag";
import type { PlanRoom, Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { PLAN_GRID } from "./plan-utils";

type RoomRectProps = {
  room: PlanRoom;
  sourceRoom?: Room;
  editable: boolean;
  scale: number;
  onChange: (room: PlanRoom) => void;
  onRemove: () => void;
  onRename?: (roomId: string, name: string) => void;
};

const MIN_SIZE = 96;

function isCoreRoom(roomId: string) {
  return roomId.startsWith("core:");
}

export function RoomRect({
  room,
  sourceRoom,
  editable,
  scale,
  onChange,
  onRemove,
  onRename,
}: RoomRectProps) {
  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(sourceRoom?.name ?? "");
  const canRename = editable && isCoreRoom(room.roomId) && Boolean(onRename);

  React.useEffect(() => {
    setDraftName(sourceRoom?.name ?? "");
  }, [sourceRoom?.name]);

  const move = usePlanDrag(
    editable && !editingName,
    () => ({ x: room.x, y: room.y }),
    ({ x, y }) => onChange({ ...room, x: Math.max(0, x), y: Math.max(0, y) }),
    { grid: PLAN_GRID, scale },
  );

  const resize = usePlanDrag(
    editable,
    () => ({ x: room.width, y: room.height }),
    ({ x, y }) =>
      onChange({
        ...room,
        width: Math.max(MIN_SIZE, x),
        height: Math.max(MIN_SIZE, y),
      }),
    { grid: PLAN_GRID, scale },
  );

  const commitRename = () => {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== sourceRoom?.name) {
      onRename?.(room.roomId, trimmed);
    } else {
      setDraftName(sourceRoom?.name ?? "");
    }
  };

  return (
    <div
      className={[
        "absolute rounded-lg border border-border/70 bg-card/35 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.02)] backdrop-blur-[1px]",
        editable && !editingName ? "cursor-grab active:cursor-grabbing" : "",
      ].join(" ")}
      style={{
        left: room.x,
        top: room.y,
        width: room.width,
        height: room.height,
      }}
      {...move}
    >
      <div
        className={[
          "flex items-center gap-1 px-3 py-2",
          editingName ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {editingName ? (
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitRename();
              }
              if (event.key === "Escape") {
                setDraftName(sourceRoom?.name ?? "");
                setEditingName(false);
              }
            }}
            className="pointer-events-auto h-6 px-1 text-[11px] font-semibold tracking-widest uppercase"
            autoFocus
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {sourceRoom?.name ?? room.roomId}
          </span>
        )}
      </div>

      {editable && (
        <>
          {canRename && !editingName && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute top-1 right-8"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setEditingName(true)}
              aria-label="Переименовать комнату"
            >
              <Pencil className="size-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1 right-1"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onRemove}
            aria-label="Удалить комнату с плана"
          >
            <X className="size-3" />
          </Button>
          <div
            className="absolute right-1 bottom-1 size-4 cursor-nwse-resize rounded-sm border-r-2 border-b-2 border-primary/60"
            aria-label="Изменить размер комнаты"
            role="separator"
            onPointerDown={(event) => {
              event.stopPropagation();
              resize.onPointerDown(event);
            }}
            onPointerMove={resize.onPointerMove}
            onPointerUp={resize.onPointerUp}
            onPointerCancel={resize.onPointerCancel}
          />
        </>
      )}
    </div>
  );
}
