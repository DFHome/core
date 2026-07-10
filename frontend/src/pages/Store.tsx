import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Check,
  Download,
  RefreshCw,
  Bluetooth,
  Radio,
  Cloud,
  Network,
  Gauge,
  Loader2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import type { InstallProgress, IntegrationCategory, StoreItem, StorePackageType } from "@/lib/types"
import { api } from "@/lib/api"
import { useStore } from "@/hooks/use-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoreManualInstallDialogs } from "@/components/store/StoreManualInstallDialogs"

const packageTypeLabel: Record<StorePackageType, string> = {
  integration: "Интеграция",
  widget: "Виджет",
}

type StoreTab = "all" | "integrations" | "widgets"

const categoryLabel: Record<IntegrationCategory, string> = {
  protocol: "Протокол",
  service: "Сервис",
  sensor: "Датчики",
  media: "Медиа",
  weather: "Погода",
}

const protocolIcon: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  bluetooth: Bluetooth,
  zigbee: Radio,
  matter: Network,
  cloud: Cloud,
  wifi: Gauge,
}

function InstallProgressBar({ progress }: { progress: InstallProgress | null }) {
  if (!progress) {
    return (
      <div className="w-full space-y-1.5">
        <Progress value={null} />
        <p className="text-muted-foreground text-xs">Подготовка…</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-1.5">
      <Progress value={progress.percent}>
        <ProgressLabel className="text-muted-foreground text-xs font-normal">
          {progress.step}
        </ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  )
}

function StoreCard({
  item,
  onInstall,
  onUpdate,
  onUninstall,
  busy,
  progress,
}: {
  item: StoreItem
  onInstall: (domain: string) => Promise<void>
  onUpdate: (domain: string) => Promise<void>
  onUninstall: (domain: string) => Promise<void>
  busy: string | null
  progress: InstallProgress | null
}) {
  const Icon = protocolIcon[item.protocols[0]] ?? Network
  const isBusy = busy === item.domain

  const handleInstall = async () => {
    try {
      await onInstall(item.domain)
      toast.success(`${item.name}: установлено`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка установки")
    }
  }

  const handleUpdate = async () => {
    try {
      await onUpdate(item.domain)
      toast.success(`${item.name}: обновлено`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка обновления")
    }
  }

  const handleUninstall = async () => {
    try {
      await onUninstall(item.domain)
      toast.success(`${item.name}: удалено`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка удаления")
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-base">
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate">{item.name}</div>
            <div className="text-muted-foreground text-xs font-normal">
              {item.author} · v{item.version}
              {item.latestVersion ? ` → v${item.latestVersion}` : ""}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <p className="text-muted-foreground text-sm">{item.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="font-normal">
            {packageTypeLabel[item.packageType]}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {categoryLabel[item.category]}
          </Badge>
          {item.protocols.map((p) => (
            <Badge key={p} variant="outline" className="font-normal">
              {p}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {isBusy && item.status !== "installed" && (
          <InstallProgressBar progress={progress} />
        )}
        {item.status === "installed" ? (
          <>
            <Button variant="outline" className="w-full" disabled>
              <Check className="size-4" />
              Установлено
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full"
              disabled={isBusy}
              onClick={() => void handleUninstall()}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Удалить
            </Button>
          </>
        ) : item.status === "update_available" ? (
          <Button
            variant="secondary"
            className="w-full"
            disabled={isBusy}
            onClick={() => void handleUpdate()}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Обновить до v{item.latestVersion}
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={isBusy}
            onClick={() => void handleInstall()}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Установить{item.packageType === "widget" ? " виджет" : ""}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function Store() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get("tab") as StoreTab | null) ?? "all"
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { items, isLoading, refresh, install, update, uninstall } = useStore()

  const filtered = items.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    const matchesTab =
      tab === "all" ||
      (tab === "integrations" && item.packageType === "integration") ||
      (tab === "widgets" && item.packageType === "widget")
    return matchesQuery && matchesTab
  })

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const startProgressPolling = (domain: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    setProgress(null)

    const poll = async () => {
      try {
        const next = await api.getInstallProgress(domain)
        if (next) setProgress(next)
      } catch {
        // ignore transient polling errors
      }
    }

    void poll()
    pollRef.current = setInterval(() => {
      void poll()
    }, 300)
  }

  const stopProgressPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setProgress(null)
  }

  const wrapWithProgress =
    (fn: (domain: string) => Promise<void>) => async (domain: string) => {
      setBusy(domain)
      startProgressPolling(domain)
      try {
        await fn(domain)
      } finally {
        stopProgressPolling()
        setBusy(null)
      }
    }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Загрузка каталога…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Каталог пакетов: интеграции устройств и виджеты дашборда из Git-репозиториев.
        </p>
        <StoreManualInstallDialogs onInstalled={refresh} />
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setSearchParams({ tab: value })}
      >
        <TabsList>
          <TabsTrigger value="all">Всё</TabsTrigger>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
          <TabsTrigger value="widgets">Виджеты</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-4">
          <Input
            placeholder="Поиск…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <StoreCard
                key={item.domain}
                item={item}
                busy={busy}
                progress={busy === item.domain ? progress : null}
                onInstall={wrapWithProgress(install)}
                onUpdate={wrapWithProgress(update)}
                onUninstall={async (domain) => {
                  setBusy(domain)
                  try {
                    await uninstall(domain)
                  } finally {
                    setBusy(null)
                  }
                }}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm">Ничего не найдено</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
