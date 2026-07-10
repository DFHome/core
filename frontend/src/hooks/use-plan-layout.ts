import * as React from "react";

import { api } from "@/lib/api";
import type { PlanLayout } from "@/lib/types";

const EMPTY: PlanLayout = { rooms: [], devices: [] };

/**
 * План дома хранится в ядре (SQLite): GET возвращает сохранённый пользователем
 * layout, а при его отсутствии — suggested-раскладку от установленных интеграций.
 */
function layoutsEqual(a: PlanLayout, b: PlanLayout) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function usePlanLayout() {
  const [layout, setLayout] = React.useState<PlanLayout>(EMPTY);
  const [savedLayout, setSavedLayout] = React.useState<PlanLayout>(EMPTY);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const next = await api.getPlan();
      setLayout(next);
      setSavedLayout(next);
    } catch {
      setLayout(EMPTY);
      setSavedLayout(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const isDirty = !layoutsEqual(layout, savedLayout);

  const save = React.useCallback(async () => {
    const next = await api.savePlan(layout);
    setLayout(next);
    setSavedLayout(next);
  }, [layout]);

  const reset = React.useCallback(async () => {
    try {
      const next = await api.resetPlan();
      setLayout(next);
      setSavedLayout(next);
    } catch {
      await load();
    }
  }, [load]);

  const discardChanges = React.useCallback(() => {
    setLayout(savedLayout);
  }, [savedLayout]);

  return { layout, setLayout, save, reset, discardChanges, isLoading, isDirty };
}
