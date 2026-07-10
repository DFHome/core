import * as React from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type UnsavedGuard = {
  isDirty: boolean
  save: () => Promise<boolean>
  discard: () => void
}

type UnsavedChangesContextValue = {
  setGuard: (guard: UnsavedGuard | null) => void
  requestNavigation: (to: string) => void
}

const UnsavedChangesContext =
  React.createContext<UnsavedChangesContextValue | null>(null)

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const guardRef = React.useRef<UnsavedGuard | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [pendingPath, setPendingPath] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const setGuard = React.useCallback((guard: UnsavedGuard | null) => {
    guardRef.current = guard
  }, [])

  const requestNavigation = React.useCallback(
    (to: string) => {
      const guard = guardRef.current
      if (guard?.isDirty) {
        setPendingPath(to)
        setDialogOpen(true)
        return
      }
      navigate(to)
    },
    [navigate],
  )

  const handleDismiss = React.useCallback(() => {
    setDialogOpen(false)
    setPendingPath(null)
  }, [])

  const handleDiscard = React.useCallback(() => {
    const guard = guardRef.current
    guard?.discard()
    setDialogOpen(false)
    if (pendingPath) {
      navigate(pendingPath)
    }
    setPendingPath(null)
  }, [navigate, pendingPath])

  const handleSave = React.useCallback(async () => {
    const guard = guardRef.current
    if (!guard) {
      return
    }
    setIsSaving(true)
    try {
      const saved = await guard.save()
      if (!saved) {
        return
      }
      setDialogOpen(false)
      if (pendingPath) {
        navigate(pendingPath)
      }
      setPendingPath(null)
    } finally {
      setIsSaving(false)
    }
  }, [navigate, pendingPath])

  const value = React.useMemo(
    () => ({ setGuard, requestNavigation }),
    [setGuard, requestNavigation],
  )

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Несохранённые изменения</DialogTitle>
            <DialogDescription>
              Вы не сохранили изменения плана. Сохранить перед переходом?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              Не сохранять
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChangesGuard() {
  const context = React.useContext(UnsavedChangesContext)
  if (!context) {
    throw new Error(
      "useUnsavedChangesGuard must be used within UnsavedChangesProvider",
    )
  }
  return context
}
