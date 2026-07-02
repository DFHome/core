import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiErrorMessage, endpoints } from "../api/client";

export default function Scenarios() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["scenarios"],
    queryFn: endpoints.getScenarios,
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => endpoints.runScenario(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => endpoints.deleteScenario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarios"] }),
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Сценарии</h2>
        <Link to="/scenarios/new">
          <button className="primary">+ Новый сценарий</button>
        </Link>
      </div>

      <div className="banner info">
        Запуск сценариев работает через официальный API Яндекса. Создание и редактирование
        используют внутренний API — для этого в Настройках нужно указать cookie сессии.
      </div>

      {isLoading && <p className="loading">Загрузка…</p>}
      {error && <div className="banner error">{apiErrorMessage(error)}</div>}
      {runMutation.isError && <div className="banner error">{apiErrorMessage(runMutation.error)}</div>}
      {deleteMutation.isError && <div className="banner error">{apiErrorMessage(deleteMutation.error)}</div>}

      {data?.length === 0 && <p className="loading">Сценариев пока нет.</p>}

      {data?.map((scenario) => (
        <div className="scenario-row" key={scenario.id}>
          <span>{scenario.name}</span>
          <div className="actions">
            <button
              className="secondary"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate(scenario.id)}
            >
              Запустить
            </button>
            <Link to={`/scenarios/${scenario.id}/edit`}>
              <button className="secondary">Изменить</button>
            </Link>
            <button
              className="danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Удалить сценарий «${scenario.name}»?`)) {
                  deleteMutation.mutate(scenario.id);
                }
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
