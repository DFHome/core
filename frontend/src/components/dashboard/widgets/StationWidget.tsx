import { Link } from "react-router-dom";
import { Music, Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StationWidget } from "@/lib/types";

export function StationWidgetCard({ widget }: { widget: StationWidget }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted flex size-16 items-center justify-center rounded-md">
          <Music className="text-muted-foreground size-8" />
        </div>
        <p className="text-muted-foreground text-sm">
          Для управления музыкой установите интеграцию Яндекс из{" "}
          <Link to="/store?tab=integrations" className="text-primary underline">
            магазина
          </Link>
          .
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled>
            <SkipBack className="size-4" />
          </Button>
          <Button size="icon" disabled>
            <Play className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled>
            <Pause className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled>
            <SkipForward className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
