import type { IntegrationCategory } from "./types";

export type IntegrationInfo = {
  domain: string;
  version: string;
  manifest: Record<string, unknown>;
  configSchema: Record<string, unknown>;
  config: Record<string, unknown>;
  loaded: boolean;
};

export function integrationCategory(
  manifest: Record<string, unknown>,
): IntegrationCategory | undefined {
  const category = manifest.category;
  return typeof category === "string"
    ? (category as IntegrationCategory)
    : undefined;
}

/** Installed integration that can contribute devices (not weather-only). */
export function isDeviceIntegration(integration: IntegrationInfo): boolean {
  return integrationCategory(integration.manifest) !== "weather";
}

export function hasDeviceIntegration(integrations: IntegrationInfo[]): boolean {
  return integrations.some(isDeviceIntegration);
}
