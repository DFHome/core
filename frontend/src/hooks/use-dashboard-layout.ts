import * as React from "react";

import { api } from "@/lib/api";
import type { Widget } from "@/lib/types";
import { autoAssignPositions, widgetsEqual } from "@/components/dashboard/widget-grid-utils";

export function useDashboardLayout() {
  const [widgets, setWidgets] = React.useState<Widget[]>([]);
  const [savedWidgets, setSavedWidgets] = React.useState<Widget[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const loaded = await api.getWidgets();
      setWidgets(loaded);
      setSavedWidgets(loaded);
    } catch {
      setWidgets([]);
      setSavedWidgets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const isDirty = !widgetsEqual(widgets, savedWidgets);

  const save = React.useCallback(async () => {
    const normalized = autoAssignPositions(widgets);
    const saved = await api.saveWidgets(normalized);
    setWidgets(saved);
    setSavedWidgets(saved);
    return saved;
  }, [widgets]);

  const discardChanges = React.useCallback(() => {
    setWidgets(savedWidgets);
  }, [savedWidgets]);

  const resetToDefault = React.useCallback(async () => {
    const saved = await api.resetWidgets();
    setWidgets(saved);
    setSavedWidgets(saved);
    return saved;
  }, []);

  return {
    widgets,
    setWidgets,
    save,
    discardChanges,
    resetToDefault,
    isLoading,
    isDirty,
    refresh,
  };
}
