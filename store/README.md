# DFHome Store

Публичный **индекс магазина** для [DFHome](https://github.com/DFHome/core): список
Git-репозиториев с пакетами, которые можно установить из UI (вкладки «Всё»,
«Интеграции», «Виджеты»).

Опубликованная копия индекса: [github.com/DFHome/store](https://github.com/DFHome/store).

Ядро не хранит метаданные пакетов — только URL репозиториев. Имя, описание,
версия и тип пакета читаются из `manifest.json` каждого репозитория; версия для
установки определяется по **последнему SemVer-тегу** (`v1.0.0`, `v1.2.3`, …).

## Формат `repositories.json`

```json
{
  "packages": [
    { "repository": "https://github.com/DFHome/integration-demo" },
    { "repository": "https://github.com/DFHome/widget-metric" }
  ]
}
```

Ключ `packages` — основной. Для обратной совместимости ядро также принимает
устаревший ключ `integrations` с тем же форматом.

## Типы пакетов

В `manifest.json` пакета указывается `package_type`:

| Значение | Назначение |
|----------|------------|
| `integration` (по умолчанию) | Источник устройств, комнат, плана и т.д. |
| `widget` | Шаблон виджета дашборда (и опционально API-роуты пакета) |

## Текущий каталог

| Репозиторий | Тип |
|-------------|-----|
| [integration-demo](https://github.com/DFHome/integration-demo) | интеграция |
| [widget-metric](https://github.com/DFHome/widget-metric) | виджет |
| [widget-chart](https://github.com/DFHome/widget-chart) | виджет |
| [widget-weather](https://github.com/DFHome/widget-weather) | виджет |
| [widget-yandex-station](https://github.com/DFHome/widget-yandex-station) | виджет |

Локальный черновик индекса: [`repositories.json`](repositories.json). После
изменений — commit и push в [DFHome/store](https://github.com/DFHome/store),
ветка **`main`**.

Подробнее см. README в репозитории store и
[docs/INTEGRATIONS.md](../docs/INTEGRATIONS.md) в ядре.
