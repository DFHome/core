import { Link } from "react-router-dom";

import { useDevices } from "@/hooks/use-devices";
import { usePlanLayout } from "@/hooks/use-plan-layout";
import { useRooms } from "@/hooks/use-rooms";
import { PlanCanvas } from "@/components/plan/PlanCanvas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlanWidget } from "@/lib/types";

export function PlanWidgetCard({ widget }: { widget: PlanWidget }) {
  const { devices } = useDevices();
  const { rooms } = useRooms();
  const { layout, isLoading } = usePlanLayout();

  const planRoomIds = new Set(layout.rooms.map((room) => room.roomId));
  const visibleRooms = rooms.filter((room) => planRoomIds.has(room.id));

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
        <Button variant="outline" size="sm" render={<Link to="/plan" />}>
          Редактировать
        </Button>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-2">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Загрузка плана…</p>
        ) : (
          <div className="h-[280px] overflow-hidden rounded-md border">
            <PlanCanvas
              rooms={visibleRooms}
              devices={devices}
              layout={layout}
              editable={false}
              selectedDeviceId={null}
              onSelectDevice={() => {}}
              onChangeRoom={() => {}}
              onRemoveRoom={() => {}}
              onRenameRoom={() => {}}
              onChangeDevice={() => {}}
              onRemoveDevice={() => {}}
              onMakeStrip={() => {}}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
