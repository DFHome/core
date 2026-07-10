import * as React from "react";
import { toast } from "sonner";

import { WidgetsGrid } from "@/components/dashboard/WidgetsGrid";
import { autoAssignPositions } from "@/components/dashboard/widget-grid-utils";
import { Button } from "@/components/ui/button";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

export default function Dashboard() {
  const {
    widgets,
    setWidgets,
    save,
    discardChanges,
    resetToDefault,
    isLoading,
    isDirty,
  } = useDashboardLayout();
  const { setGuard } = useUnsavedChangesGuard();
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSave = React.useCallback(async (): Promise<boolean> => {
    try {
      const saved = await save();
      setWidgets(saved);
      toast.success("Дашборд сохранён");
      return true;
    } catch {
      toast.error("Не удалось сохранить дашборд");
      return false;
    }
  }, [save, setWidgets]);

  const handleDiscard = React.useCallback(() => {
    discardChanges();
  }, [discardChanges]);

  React.useEffect(() => {
    if (!isEditing || !isDirty) {
      setGuard(null);
      return;
    }
    setGuard({ isDirty, save: handleSave, discard: handleDiscard });
    return () => setGuard(null);
  }, [handleDiscard, handleSave, isDirty, isEditing, setGuard]);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Загрузка дашборда…</p>;
  }

  const displayWidgets = autoAssignPositions(widgets);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground flex-1 text-sm">
          Настраиваемый дашборд: план дома и виджеты из магазина.
        </p>
        <Button
          variant={isEditing ? "default" : "outline"}
          onClick={() => {
            if (isEditing && isDirty) {
              void handleSave();
            }
            setIsEditing((value) => !value);
          }}
        >
          {isEditing ? "Готово" : "Изменить"}
        </Button>
        {isEditing && (
          <>
            <Button
              variant="secondary"
              disabled={!isDirty}
              onClick={() => void handleSave()}
            >
              Сохранить
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void resetToDefault().then(() => toast.info("Сброшено к базовому"));
              }}
            >
              Сбросить
            </Button>
          </>
        )}
      </div>

      <WidgetsGrid
        widgets={displayWidgets}
        isEditing={isEditing}
        onChange={setWidgets}
      />
    </div>
  );
}
