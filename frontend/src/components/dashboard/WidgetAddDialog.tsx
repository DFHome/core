import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDevices } from "@/hooks/use-devices";
import { useStore } from "@/hooks/use-store";
import { useWidgetCatalog } from "@/hooks/use-widget-catalog";
import type { Widget, WidgetCatalogItem, WidgetKind, WidgetSize } from "@/lib/types";
import {
  defaultWidgetSize,
  findPlacementAnchor,
} from "@/components/dashboard/widget-grid-utils";

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const KIND_LABEL: Record<WidgetKind, string> = {
  plan: "План дома",
  devices_summary: "Устройства",
  room_sensor: "Показатель",
  sensor_chart: "График",
  weather: "Погода",
  station: "Яндекс Станция",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: Widget[];
  row: number;
  col: number;
  onAdd: (widget: Widget) => void;
}

export function WidgetAddDialog({
  open,
  onOpenChange,
  widgets,
  row,
  col,
  onAdd,
}: Props) {
  const { catalog } = useWidgetCatalog();
  const { items: storeItems } = useStore();
  const { devices } = useDevices();
  const [selected, setSelected] = React.useState<WidgetCatalogItem | null>(null);
  const [title, setTitle] = React.useState("");
  const [query, setQuery] = React.useState("Москва");
  const [deviceId, setDeviceId] = React.useState("");
  const [propertyInstance, setPropertyInstance] = React.useState("");
  const [size, setSize] = React.useState<WidgetSize>("s");

  React.useEffect(() => {
    if (!open) {
      setSelected(null);
      setTitle("");
      setQuery("Москва");
      setDeviceId("");
      setPropertyInstance("");
      setSize("s");
    }
  }, [open]);

  const isInstalled = (item: WidgetCatalogItem) =>
    item.sourceDomain === "core" ||
    storeItems.some(
      (storeItem) =>
        storeItem.domain === item.sourceDomain && storeItem.status === "installed",
    );

  const selectedDevice = devices.find((device) => device.id === deviceId);
  const numericProperties =
    selectedDevice?.entities.flatMap((entity) => entity.properties).filter(
      (property) => typeof property.value === "number",
    ) ?? [];

  const handleSelect = (item: WidgetCatalogItem) => {
    setSelected(item);
    setTitle(item.title);
    setSize(defaultWidgetSize(item.kind));
  };

  const buildWidget = (): Widget | null => {
    if (!selected) return null;
    const anchor = findPlacementAnchor(widgets, row, col, size);
    if (!anchor) return null;
    const base = {
      id: genId(),
      title: title.trim() || selected.title,
      size,
      gridRow: anchor.row,
      gridCol: anchor.col,
      sourceDomain: selected.sourceDomain,
    };

    switch (selected.kind) {
      case "plan":
        return { ...base, kind: "plan" };
      case "devices_summary":
        return { ...base, kind: "devices_summary" };
      case "weather":
        if (!query.trim()) return null;
        return { ...base, kind: "weather", query: query.trim() };
      case "station":
        return { ...base, kind: "station" };
      case "room_sensor":
      case "sensor_chart": {
        const property = numericProperties.find(
          (item) => item.instance === propertyInstance,
        );
        if (!selectedDevice || !property) return null;
        if (selected.kind === "room_sensor") {
          return {
            ...base,
            kind: "room_sensor",
            deviceId: selectedDevice.id,
            deviceName: selectedDevice.name,
            propertyInstance: property.instance,
            label: property.label,
          };
        }
        return {
          ...base,
          kind: "sensor_chart",
          deviceId: selectedDevice.id,
          deviceName: selectedDevice.name,
          propertyInstance: property.instance,
          label: property.label,
          unit: property.unit,
        };
      }
    }
  };

  const handleAdd = () => {
    const widget = buildWidget();
    if (!widget) return;
    onAdd(widget);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selected ? KIND_LABEL[selected.kind] : "Добавить виджет"}
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="grid gap-2">
            {catalog.map((item) => {
              const installed = isInstalled(item);
              return (
                <Button
                  key={`${item.sourceDomain}:${item.kind}`}
                  variant="outline"
                  className="h-auto justify-start px-3 py-2"
                  disabled={!installed}
                  onClick={() => handleSelect(item)}
                >
                  <div className="text-left">
                    <div>{KIND_LABEL[item.kind]}</div>
                    {!installed && (
                      <div className="text-muted-foreground text-xs font-normal">
                        <Link to="/store?tab=widgets" className="underline">
                          Установить из магазина
                        </Link>
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="widget-title">Заголовок</Label>
              <Input
                id="widget-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {(selected.kind === "room_sensor" ||
              selected.kind === "sensor_chart") && (
              <>
                <div className="space-y-1.5">
                  <Label>Устройство</Label>
                  <Select
                    value={deviceId}
                    onValueChange={(value) => setDeviceId(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите устройство" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Показатель</Label>
                  <Select
                    value={propertyInstance}
                    onValueChange={(value) => setPropertyInstance(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите показатель" />
                    </SelectTrigger>
                    <SelectContent>
                      {numericProperties.map((property) => (
                        <SelectItem key={property.instance} value={property.instance}>
                          {property.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selected.kind === "weather" && (
              <div className="space-y-1.5">
                <Label htmlFor="widget-city">Город</Label>
                <Input
                  id="widget-city"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Размер</Label>
              <Select value={size} onValueChange={(v) => setSize(v as WidgetSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s">S</SelectItem>
                  <SelectItem value="m">M</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {selected ? (
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Назад
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="size-4" />
                Добавить
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SettingsProps {
  widget: Widget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (widget: Widget) => void;
}

export function WidgetSettingsDialog({
  widget,
  open,
  onOpenChange,
  onSave,
}: SettingsProps) {
  const [draft, setDraft] = React.useState<Widget | null>(widget);

  React.useEffect(() => {
    setDraft(widget);
  }, [widget]);

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки виджета</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Заголовок</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          {draft.kind === "weather" && (
            <div className="space-y-1.5">
              <Label>Город</Label>
              <Input
                value={draft.query}
                onChange={(e) => setDraft({ ...draft, query: e.target.value })}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            <Settings className="size-4" />
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WidgetEditActions({
  onSettings,
  onRemove,
}: {
  onSettings: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="absolute top-2 right-2 z-10 flex gap-1">
      <Button variant="secondary" size="icon" className="size-7" onClick={onSettings}>
        <Settings className="size-3.5" />
      </Button>
      <Button variant="secondary" size="icon" className="size-7" onClick={onRemove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
