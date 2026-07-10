/**
 * Единая модель устройств DFHome (frontend-зеркало ядра).
 *
 * Соответствует docs/ARCHITECTURE.md ("Единая модель устройств"):
 * Device -> Entity -> Capability / Property -> Room.
 * Модель вендор-независима: UI, план дома и виджеты работают с ней одинаково,
 * независимо от источника устройства (интеграции).
 */

/** Управляемая функция: как её рисовать в UI. */
export type CapabilityKind =
  | "switch"
  | "slider"
  | "color"
  | "mode"
  | "unsupported";

/** Управляемая функция сущности (on/off, яркость, цвет, режим, ...). */
export interface Capability {
  kind: CapabilityKind;
  /** Стабильный идентификатор функции внутри сущности (например, "on"). */
  instance: string;
  label: string;
  value: unknown;
  /** slider */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** mode / enum */
  options?: string[];
  /** color */
  colorModel?: "hsv" | "rgb" | "temperature_k";
}

/** Телеметрия только на чтение (температура, влажность, батарея, движение). */
export type PropertyKind =
  | "temperature"
  | "humidity"
  | "battery"
  | "motion"
  | "power"
  | "illuminance"
  | "co2"
  | string;

export interface Property {
  kind: PropertyKind;
  instance: string;
  label: string;
  value: number | string | boolean | null;
  unit?: string;
}

/** Конкретная функция устройства (устройство может иметь несколько сущностей). */
export interface Entity {
  id: string;
  name: string;
  capabilities: Capability[];
  properties: Property[];
}

export type DeviceType =
  | "light"
  | "switch"
  | "socket"
  | "sensor"
  | "thermostat"
  | "media_device"
  | "other";

/** Физическое или логическое устройство. `id` включает домен интеграции. */
export interface Device {
  /** Глобально уникальный id, с префиксом интеграции (например "yandex:abc"). */
  id: string;
  /** Домен интеграции-владельца. */
  integration: string;
  name: string;
  type: DeviceType;
  roomId: string | null;
  online: boolean;
  entities: Entity[];
}

/** Группировка устройств; используется планом дома и виджетами. */
export interface Room {
  id: string;
  name: string;
  /** Иконка (lucide-имя) для UI. */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Визуальный план дома
// ---------------------------------------------------------------------------

/** Комната, нарисованная прямоугольником на canvas плана. */
export interface PlanRoom {
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Как устройство отображается именно на плане. */
export type PlanDeviceVisualKind = "bulb" | "strip";

export interface PlanDevicePosition {
  deviceId: string;
  /** Fallback-позиция маркера; сохраняется даже для режима strip. */
  x: number;
  y: number;
  /** `strip` рисует источник света вокруг attachedRoomId. */
  visualKind: PlanDeviceVisualKind;
  attachedRoomId?: string | null;
}

export interface PlanLayout {
  rooms: PlanRoom[];
  devices: PlanDevicePosition[];
}

// ---------------------------------------------------------------------------
// Радар обнаружения устройств (страница «Устройства»)
// ---------------------------------------------------------------------------

export interface RadarBlip {
  id: string;
  name: string;
  type: DeviceType;
  /** 0..1 — расстояние от центра */
  distance: number;
  /** 0..360 — угол на радаре */
  bearing: number;
}

export type DiscoveredDeviceStatus = "found" | "configuring" | "added";

/** Устройство, найденное при сканировании (до добавления в ядро). */
export interface DiscoveredDevice {
  id: string;
  name: string;
  type: DeviceType;
  bearing: number;
  distance: number;
  status: DiscoveredDeviceStatus;
  /** 0..100 — прогресс настройки */
  progress: number;
}

export type DeviceScanPhase = "scanning" | "configuring" | "complete";

export type DeviceScanEventKind =
  | "started"
  | "tick"
  | "discovered"
  | "finished"
  | "progress"
  | "added"
  | "complete"
  | "cancelled";

export interface ScanWsEvent {
  kind: DeviceScanEventKind;
  phase?: DeviceScanPhase | null;
  remainingSeconds?: number | null;
  device?: DiscoveredDevice | null;
  deviceId?: string | null;
  progress?: number | null;
}

// ---------------------------------------------------------------------------
// Виджеты дашборда
// ---------------------------------------------------------------------------

export type WidgetSize = "s" | "m" | "l";

export type WidgetKind =
  | "plan"
  | "devices_summary"
  | "room_sensor"
  | "sensor_chart"
  | "weather"
  | "station";

export interface WidgetBase {
  id: string;
  title: string;
  size?: WidgetSize;
  gridRow?: number;
  gridCol?: number;
  sourceDomain?: string;
}

export interface PlanWidget extends WidgetBase {
  kind: "plan";
}

export interface DevicesSummaryWidget extends WidgetBase {
  kind: "devices_summary";
}

export interface RoomSensorWidget extends WidgetBase {
  kind: "room_sensor";
  deviceId: string;
  deviceName: string;
  propertyInstance: string;
  label: string;
}

export interface SensorChartWidget extends WidgetBase {
  kind: "sensor_chart";
  deviceId: string;
  deviceName: string;
  propertyInstance: string;
  label: string;
  unit?: string | null;
}

export interface WeatherWidget extends WidgetBase {
  kind: "weather";
  query: string;
}

export interface StationWidget extends WidgetBase {
  kind: "station";
  deviceId?: string;
  deviceName?: string;
}

export type Widget =
  | PlanWidget
  | DevicesSummaryWidget
  | RoomSensorWidget
  | SensorChartWidget
  | WeatherWidget
  | StationWidget;

export interface WidgetCatalogItem {
  kind: WidgetKind;
  sourceDomain: string;
  title: string;
  description?: string | null;
}

export interface WeatherData {
  city: string;
  lat: number;
  lon: number;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  precipitation: number | null;
  hourly: Array<{
    time: string;
    precipitationProbability: number | null;
    precipitation: number | null;
    weatherCode: number | null;
  }>;
}

export interface HistoryPoint {
  ts: number;
  value: number;
}

export interface DeviceHistory {
  series: Record<string, HistoryPoint[]>;
  latest: Record<string, HistoryPoint>;
}

// ---------------------------------------------------------------------------
// Магазин
// ---------------------------------------------------------------------------

export type StorePackageType = "integration" | "widget";

export type IntegrationCategory =
  | "protocol"
  | "service"
  | "sensor"
  | "media"
  | "weather";

export type StoreItemStatus = "installed" | "available" | "update_available";

export interface StoreItem {
  domain: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  version: string;
  author: string;
  packageType: StorePackageType;
  status: StoreItemStatus;
  /** Заявленные протоколы для маршрутизации авто-обнаружения. */
  protocols: string[];
  /** Доступная версия при status === "update_available". */
  latestVersion?: string;
}

export type InstallProgressStatus = "running" | "done" | "error";

export interface InstallProgress {
  domain: string;
  step: string;
  percent: number;
  status: InstallProgressStatus;
}
