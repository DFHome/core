import * as React from "react";

import { api } from "@/lib/api";
import type { IntegrationInfo } from "@/lib/integration-utils";

export function useIntegrations() {
  const [integrations, setIntegrations] = React.useState<IntegrationInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      setIntegrations((await api.getIntegrations()) as IntegrationInfo[]);
    } catch {
      setIntegrations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { integrations, isLoading, refresh };
}
