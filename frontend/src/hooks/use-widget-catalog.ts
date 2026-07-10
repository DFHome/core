import * as React from "react";

import { api } from "@/lib/api";
import type { WidgetCatalogItem } from "@/lib/types";

export function useWidgetCatalog() {
  const [catalog, setCatalog] = React.useState<WidgetCatalogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      setCatalog(await api.getWidgetCatalog());
    } catch {
      setCatalog([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { catalog, isLoading, refresh };
}
