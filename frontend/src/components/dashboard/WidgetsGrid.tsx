import * as React from "react";
import type { CSSProperties } from "react";
import { GripVertical, Plus } from "lucide-react";

import {
  WidgetAddDialog,
  WidgetEditActions,
  WidgetSettingsDialog,
} from "@/components/dashboard/WidgetAddDialog";
import { renderWidget } from "@/components/dashboard/WidgetRenderer";
import {
  autoAssignPositions,
  buildOccupied,
  canPlaceWidget,
  displayWidgetSize,
  GRID_COLS,
  gridArea,
  widgetSpans,
} from "@/components/dashboard/widget-grid-utils";
import type { Widget } from "@/lib/types";

interface Props {
  widgets: Widget[];
  isEditing: boolean;
  onChange: (widgets: Widget[]) => void;
}

export function WidgetsGrid({ widgets, isEditing, onChange }: Props) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropPreview, setDropPreview] = React.useState<{
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
    valid: boolean;
  } | null>(null);
  const [picker, setPicker] = React.useState<{ row: number; col: number } | null>(
    null,
  );
  const [settingsWidget, setSettingsWidget] = React.useState<Widget | null>(null);

  const layoutWidgets = React.useMemo(
    () => autoAssignPositions(widgets),
    [widgets],
  );

  const rowCount = Math.max(
    4,
    ...layoutWidgets.map((widget) => {
      if (widget.gridRow === undefined) return 0;
      return widget.gridRow + widgetSpans(displayWidgetSize(widget)).row;
    }),
  );

  const updateDrop = (row: number, col: number) => {
    if (!dragId) return;
    const widget = layoutWidgets.find((item) => item.id === dragId);
    if (!widget) return;
    const span = widgetSpans(displayWidgetSize(widget));
    const valid = canPlaceWidget(layoutWidgets, dragId, row, col);
    setDropPreview({ row, col, rowSpan: span.row, colSpan: span.col, valid });
  };

  const moveWidget = (id: string, row: number, col: number) => {
    if (!canPlaceWidget(layoutWidgets, id, row, col)) return;
    onChange(
      layoutWidgets.map((widget) =>
        widget.id === id ? { ...widget, gridRow: row, gridCol: col } : widget,
      ),
    );
  };

  const removeWidget = (id: string) => {
    onChange(layoutWidgets.filter((widget) => widget.id !== id));
  };

  return (
    <>
      <div
        className={`relative grid grid-cols-4 gap-3 ${isEditing ? "rounded-lg border border-dashed p-2" : ""}`}
        style={{ "--grid-rows": rowCount } as CSSProperties}
        onDragOver={(event) => {
          if (!dragId) return;
          event.preventDefault();
        }}
      >
        {isEditing &&
          Array.from({ length: rowCount * GRID_COLS }).map((_, index) => {
            const row = Math.floor(index / GRID_COLS);
            const col = index % GRID_COLS;
            const occupied = buildOccupied(layoutWidgets).has(`${row},${col}`);
            return (
              <button
                key={`cell-${row}-${col}`}
                type="button"
                className={`min-h-16 rounded-md border border-transparent ${
                  occupied
                    ? "pointer-events-none"
                    : "hover:border-primary/40 hover:bg-muted/40"
                }`}
                style={gridArea(row, col, 1, 1)}
                onClick={() => {
                  if (!occupied) setPicker({ row, col });
                }}
              >
                {!occupied && (
                  <Plus className="text-muted-foreground mx-auto size-4" />
                )}
              </button>
            );
          })}

        {dropPreview && (
          <div
            className={`pointer-events-none rounded-md border-2 border-dashed ${
              dropPreview.valid ? "border-primary/60" : "border-destructive/60"
            }`}
            style={gridArea(
              dropPreview.row,
              dropPreview.col,
              dropPreview.rowSpan,
              dropPreview.colSpan,
            )}
          />
        )}

        {layoutWidgets.map((widget) => {
          if (widget.gridRow === undefined || widget.gridCol === undefined) {
            return null;
          }
          const span = widgetSpans(displayWidgetSize(widget));
          return (
            <div
              key={widget.id}
              className="relative"
              style={gridArea(widget.gridRow, widget.gridCol, span.row, span.col)}
              draggable={isEditing}
              onDragStart={() => setDragId(widget.id)}
              onDragEnd={() => {
                if (dropPreview?.valid && dragId) {
                  moveWidget(dragId, dropPreview.row, dropPreview.col);
                }
                setDragId(null);
                setDropPreview(null);
              }}
              onDragOver={(event) => {
                if (!dragId) return;
                event.preventDefault();
                event.stopPropagation();
                updateDrop(widget.gridRow!, widget.gridCol!);
              }}
            >
              {isEditing && (
                <>
                  <div className="bg-background/80 absolute top-2 left-2 z-10 rounded p-1">
                    <GripVertical className="text-muted-foreground size-4" />
                  </div>
                  <WidgetEditActions
                    onSettings={() => setSettingsWidget(widget)}
                    onRemove={() => removeWidget(widget.id)}
                  />
                </>
              )}
              <div className="h-full">{renderWidget(widget)}</div>
            </div>
          );
        })}
      </div>

      <WidgetAddDialog
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        widgets={layoutWidgets}
        row={picker?.row ?? 0}
        col={picker?.col ?? 0}
        onAdd={(widget) => onChange([...layoutWidgets, widget])}
      />

      <WidgetSettingsDialog
        widget={settingsWidget}
        open={settingsWidget !== null}
        onOpenChange={(open) => {
          if (!open) setSettingsWidget(null);
        }}
        onSave={(widget) => {
          onChange(
            layoutWidgets.map((item) => (item.id === widget.id ? widget : item)),
          );
        }}
      />
    </>
  );
}
