import type { CSSProperties } from "react";

import type { Widget, WidgetKind, WidgetSize } from "@/lib/types";

export const GRID_COLS = 4;
export const GRID_ROWS = 10;

export function widgetSpans(size: WidgetSize): { col: number; row: number } {
  if (size === "s") return { col: 1, row: 1 };
  if (size === "m") return { col: 2, row: 2 };
  return { col: 4, row: 2 };
}

export function defaultWidgetSize(kind: WidgetKind): WidgetSize {
  if (kind === "plan") return "l";
  if (kind === "sensor_chart" || kind === "station") return "m";
  return "s";
}

export function displayWidgetSize(widget: Widget): WidgetSize {
  if (widget.size === "s" || widget.size === "m" || widget.size === "l") {
    if (widget.kind === "sensor_chart" && widget.size === "s") return "m";
    return widget.size;
  }
  return defaultWidgetSize(widget.kind);
}

function cellKey(row: number, col: number) {
  return `${row},${col}`;
}

export function buildOccupied(widgets: Widget[], ignoreId?: string): Set<string> {
  const occupied = new Set<string>();
  for (const widget of widgets) {
    if (
      widget.id === ignoreId ||
      widget.gridRow === undefined ||
      widget.gridCol === undefined
    ) {
      continue;
    }
    const span = widgetSpans(displayWidgetSize(widget));
    for (let y = 0; y < span.row; y++) {
      for (let x = 0; x < span.col; x++) {
        occupied.add(cellKey(widget.gridRow + y, widget.gridCol + x));
      }
    }
  }
  return occupied;
}

export function canPlaceWidget(
  widgets: Widget[],
  widgetId: string,
  row: number,
  col: number,
  size?: WidgetSize,
): boolean {
  const widget = widgets.find((item) => item.id === widgetId);
  if (!widget) return false;
  const span = widgetSpans(size ?? displayWidgetSize(widget));
  if (
    col + span.col > GRID_COLS ||
    row + span.row > GRID_ROWS ||
    row < 0 ||
    col < 0
  ) {
    return false;
  }
  const occupied = buildOccupied(widgets, widgetId);
  for (let y = 0; y < span.row; y++) {
    for (let x = 0; x < span.col; x++) {
      if (occupied.has(cellKey(row + y, col + x))) return false;
    }
  }
  return true;
}

export function findPlacementAnchor(
  widgets: Widget[],
  hoverRow: number,
  hoverCol: number,
  size: WidgetSize,
): { row: number; col: number } | null {
  const span = widgetSpans(size);
  const occupied = buildOccupied(widgets);
  const fits = (row: number, col: number) => {
    if (
      col + span.col > GRID_COLS ||
      row + span.row > GRID_ROWS ||
      row < 0 ||
      col < 0
    ) {
      return false;
    }
    for (let y = 0; y < span.row; y++) {
      for (let x = 0; x < span.col; x++) {
        if (occupied.has(cellKey(row + y, col + x))) return false;
      }
    }
    return true;
  };

  const candidates: { row: number; col: number }[] = [];
  for (let dr = 0; dr < span.row; dr++) {
    for (let dc = 0; dc < span.col; dc++) {
      const row = hoverRow - dr;
      const col = hoverCol - dc;
      if (
        row >= 0 &&
        col >= 0 &&
        col + span.col <= GRID_COLS &&
        row + span.row <= GRID_ROWS
      ) {
        candidates.push({ row, col });
      }
    }
  }
  candidates.sort((a, b) => a.row - b.row || a.col - b.col);
  return candidates.find((c) => fits(c.row, c.col)) ?? null;
}

export function autoAssignPositions(widgets: Widget[]): Widget[] {
  const result = widgets.map((widget) => ({ ...widget }));
  const occupied = new Set<string>();

  const mark = (row: number, col: number, colSpan: number, rowSpan: number) => {
    for (let y = 0; y < rowSpan; y++) {
      for (let x = 0; x < colSpan; x++) {
        occupied.add(cellKey(row + y, col + x));
      }
    }
  };

  const fits = (row: number, col: number, colSpan: number, rowSpan: number) => {
    if (col + colSpan > GRID_COLS) return false;
    for (let y = 0; y < rowSpan; y++) {
      for (let x = 0; x < colSpan; x++) {
        if (occupied.has(cellKey(row + y, col + x))) return false;
      }
    }
    return true;
  };

  for (const widget of result) {
    const span = widgetSpans(displayWidgetSize(widget));
    if (widget.gridRow !== undefined && widget.gridCol !== undefined) {
      mark(widget.gridRow, widget.gridCol, span.col, span.row);
      continue;
    }
    let placed = false;
    for (let row = 0; !placed && row < GRID_ROWS; row++) {
      for (let col = 0; col <= GRID_COLS - span.col; col++) {
        if (fits(row, col, span.col, span.row)) {
          widget.gridRow = row;
          widget.gridCol = col;
          mark(row, col, span.col, span.row);
          placed = true;
          break;
        }
      }
    }
  }
  return result;
}

export function gridArea(
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
): CSSProperties {
  return {
    gridRow: `${row + 1} / span ${rowSpan}`,
    gridColumn: `${col + 1} / span ${colSpan}`,
  };
}

export function widgetsEqual(a: Widget[], b: Widget[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
