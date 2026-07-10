import { useEffect, useRef, useState } from "react"
import { Download, FolderOpen, Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import type { InstallProgress } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function ManualInstallProgress({ progress }: { progress: InstallProgress | null }) {
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

export function StoreManualInstallDialogs({
  onInstalled,
}: {
  onInstalled: () => Promise<void>
}) {
  const [urlOpen, setUrlOpen] = useState(false)
  const [localOpen, setLocalOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [ref, setRef] = useState("")
  const [localPath, setLocalPath] = useState("")
  const [selectedFolder, setSelectedFolder] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<InstallProgress | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const uploadFilesRef = useRef<File[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setProgress(null)
  }

  const startPolling = () => {
    stopPolling()
    const poll = async () => {
      try {
        const next = await api.getInstallProgress("__pending__")
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

  const runManualInstall = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true)
    startPolling()
    try {
      await action()
      toast.success(successMessage)
      await onInstalled()
      setUrlOpen(false)
      setLocalOpen(false)
      setUrl("")
      setRef("")
      setLocalPath("")
      setSelectedFolder("")
      uploadFilesRef.current = []
      if (folderInputRef.current) folderInputRef.current.value = ""
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка установки")
    } finally {
      stopPolling()
      setBusy(false)
    }
  }

  const handleUrlInstall = () => {
    const trimmed = url.trim()
    if (!trimmed) {
      toast.error("Укажите URL репозитория")
      return
    }
    void runManualInstall(
      () => api.installFromUrl(trimmed, ref.trim() || undefined),
      "Пакет установлен из репозитория",
    )
  }

  const handlePathInstall = () => {
    const trimmed = localPath.trim()
    if (!trimmed) {
      toast.error("Укажите путь к папке пакета")
      return
    }
    void runManualInstall(
      () => api.installFromLocalPath(trimmed),
      "Пакет установлен из локальной папки",
    )
  }

  const handleFolderPicked = (files: FileList | null) => {
    if (!files?.length) return
    uploadFilesRef.current = Array.from(files)
    const root = files[0]?.webkitRelativePath?.split("/")[0] ?? ""
    setSelectedFolder(root || `${files.length} файлов`)
  }

  const handleUploadInstall = () => {
    if (!uploadFilesRef.current.length) {
      toast.error("Выберите папку с пакетом")
      return
    }
    void runManualInstall(
      () => api.installFromUpload(uploadFilesRef.current),
      "Пакет установлен из выбранной папки",
    )
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setUrlOpen(true)}>
          <Link2 className="size-4" />
          Установить по URL
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocalOpen(true)}>
          <FolderOpen className="size-4" />
          Из локальной папки
        </Button>
      </div>

      <Dialog open={urlOpen} onOpenChange={(open) => !busy && setUrlOpen(open)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Установить по URL</DialogTitle>
            <DialogDescription>
              Git-репозиторий с manifest.json в корне. URL сохранится в списке
              пользовательских репозиториев.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="store-repo-url">URL репозитория</Label>
              <Input
                id="store-repo-url"
                placeholder="https://github.com/org/package"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-repo-ref">Ветка или тег (необязательно)</Label>
              <Input
                id="store-repo-ref"
                placeholder="main, v1.0.0"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                disabled={busy}
              />
            </div>
            {busy && <ManualInstallProgress progress={progress} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={handleUrlInstall} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Установить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={localOpen} onOpenChange={(open) => !busy && setLocalOpen(open)}>
        <DialogContent showCloseButton className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Установить из локальной папки</DialogTitle>
            <DialogDescription>
              Папка должна содержать manifest.json и __init__.py. Путь на сервере —
              для машины, где работает ядро DFHome.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload">Выбрать папку</TabsTrigger>
              <TabsTrigger value="path">Путь на сервере</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-3 pt-2">
              <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => handleFolderPicked(e.target.files)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({ webkitdirectory: "", directory: "" } as any)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderOpen className="size-4" />
                  Выбрать папку
                </Button>
                {selectedFolder && (
                  <span className="text-muted-foreground text-sm">{selectedFolder}</span>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Файлы загружаются в ядро и устанавливаются как пакет. Подходит для
                Docker и удалённого сервера.
              </p>
              {busy && <ManualInstallProgress progress={progress} />}
              <DialogFooter className="mt-0 px-0">
                <Button variant="outline" onClick={() => setLocalOpen(false)} disabled={busy}>
                  Отмена
                </Button>
                <Button onClick={handleUploadInstall} disabled={busy || !selectedFolder}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Установить
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="path" className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="store-local-path">Абсолютный путь</Label>
                <Input
                  id="store-local-path"
                  placeholder="C:\Codes\DFHome-widget-metric или /data/packages/demo"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  disabled={busy}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Удобно при локальной разработке, когда браузер и ядро на одной машине.
              </p>
              {busy && <ManualInstallProgress progress={progress} />}
              <DialogFooter className="mt-0 px-0">
                <Button variant="outline" onClick={() => setLocalOpen(false)} disabled={busy}>
                  Отмена
                </Button>
                <Button onClick={handlePathInstall} disabled={busy || !localPath.trim()}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Установить
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
