import type { SensorPropertyVariant } from "../components/icons";

export type MetricStatus = "good" | "ok" | "bad" | "low";

const SEVERITY: Record<MetricStatus, number> = {
  good: 0,
  low: 1,
  ok: 1,
  bad: 2,
};

export interface MetricNormBand {
  lo: number;
  hi: number;
  /** Display suffix included, e.g. "40–60%" or "20–24°C". */
  label: string;
}

export function metricNormBand(variant: SensorPropertyVariant): MetricNormBand | null {
  if (variant === "temp") return { lo: 20, hi: 24, label: "20–24°C" };
  if (variant === "humidity") return { lo: 40, hi: 60, label: "40–60%" };
  if (variant === "battery") return { lo: 60, hi: 100, label: "≥60%" };
  return null;
}

/** Temperature: norm green, high red, low blue. */
function tempStatus(value: number): MetricStatus {
  if (value >= 20 && value <= 24) return "good";
  if (value > 24) return "bad";
  return "low";
}

/** Humidity: norm green, ±5 from band yellow, beyond red. */
function humidityStatus(value: number): MetricStatus {
  if (value >= 40 && value <= 60) return "good";
  if ((value >= 35 && value < 40) || (value > 60 && value <= 65)) return "ok";
  return "bad";
}

export function metricStatus(variant: SensorPropertyVariant, value: number): MetricStatus {
  if (variant === "temp") return tempStatus(value);
  if (variant === "humidity") return humidityStatus(value);
  if (variant === "battery") {
    if (value >= 60) return "good";
    if (value >= 20) return "ok";
    return "bad";
  }
  return "ok";
}

export function metricStatusFromInstance(instance: string, value: number): MetricStatus {
  if (instance === "temperature") return metricStatus("temp", value);
  if (instance === "humidity") return metricStatus("humidity", value);
  if (instance === "battery_level") return metricStatus("battery", value);
  return "ok";
}

export function metricStatusColor(status: MetricStatus): string {
  if (status === "good") return "var(--success)";
  if (status === "ok") return "var(--warning)";
  if (status === "low") return "var(--metric-cold)";
  return "var(--danger)";
}

function pickWorst(a: MetricStatus, b: MetricStatus): MetricStatus {
  return SEVERITY[b] > SEVERITY[a] ? b : a;
}

/** Room comfort — worst sensor status wins. */
export function roomComfortLevel(temps: number[], hums: number[]): MetricStatus {
  let level: MetricStatus = "good";
  if (temps.length) {
    const t = temps.reduce((s, x) => s + x, 0) / temps.length;
    level = pickWorst(level, metricStatus("temp", t));
  }
  if (hums.length) {
    const h = hums.reduce((s, x) => s + x, 0) / hums.length;
    level = pickWorst(level, metricStatus("humidity", h));
  }
  return level;
}
