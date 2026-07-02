import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiErrorMessage, endpoints } from "../api/client";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: endpoints.getSettings });

  const [oauthToken, setOauthToken] = useState("");
  const [quasarCookie, setQuasarCookie] = useState("");
  const [quasarCsrf, setQuasarCsrf] = useState("");

  const saveMutation = useMutation({
    mutationFn: endpoints.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setOauthToken("");
      setQuasarCookie("");
      setQuasarCsrf("");
    },
  });

  const testMutation = useMutation({ mutationFn: endpoints.testConnection });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const update: Record<string, string> = {};
    if (oauthToken.trim()) update.yandex_oauth_token = oauthToken.trim();
    if (quasarCookie.trim()) update.quasar_cookie = quasarCookie.trim();
    if (quasarCsrf.trim()) update.quasar_csrf_token = quasarCsrf.trim();
    if (Object.keys(update).length === 0) return;
    saveMutation.mutate(update);
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Настройки</h2>

      {isLoading && <p className="loading">Загрузка…</p>}

      {data && (
        <div className="banner info">
          OAuth-токен: {data.has_oauth_token ? `настроен (${data.oauth_token_preview})` : "не настроен"}
          <br />
          Quasar cookie: {data.has_quasar_cookie ? `настроен (${data.quasar_cookie_preview})` : "не настроен"}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="form-field">
          <label>OAuth-токен (api.iot.yandex.net)</label>
          <input
            type="password"
            placeholder="AgAAAA...."
            value={oauthToken}
            onChange={(e) => setOauthToken(e.target.value)}
          />
          <small>
            Получите на{" "}
            <a href="https://oauth.yandex.ru/" target="_blank" rel="noreferrer">
              oauth.yandex.ru
            </a>{" "}
            со scope iot:view + iot:control. Нужен для просмотра и управления устройствами, а
            также запуска сценариев.
          </small>
        </div>

        <div className="form-field">
          <label>Quasar Cookie (iot.quasar.yandex.ru)</label>
          <textarea
            rows={3}
            placeholder="Session_id=...; sessionid2=...; yandexuid=..."
            value={quasarCookie}
            onChange={(e) => setQuasarCookie(e.target.value)}
          />
          <small>
            Скопируйте из DevTools → Network → любой запрос к iot.quasar.yandex.ru → заголовок
            Cookie. Нужен только для создания/редактирования сценариев.
          </small>
        </div>

        <div className="form-field">
          <label>Quasar CSRF-токен (опционально)</label>
          <input
            type="text"
            placeholder="x-csrf-token"
            value={quasarCsrf}
            onChange={(e) => setQuasarCsrf(e.target.value)}
          />
        </div>

        <button className="primary" type="submit" disabled={saveMutation.isPending}>
          Сохранить
        </button>
      </form>

      {saveMutation.isError && <div className="banner error">{apiErrorMessage(saveMutation.error)}</div>}
      {saveMutation.isSuccess && <div className="banner success">Сохранено</div>}

      <div style={{ marginTop: 24 }}>
        <button className="secondary" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
          Проверить связь
        </button>
        {testMutation.data && (
          <div className={`banner ${testMutation.data.official_api ? "success" : "error"}`} style={{ marginTop: 12 }}>
            Официальный API: {testMutation.data.official_api ? "OK" : testMutation.data.official_api_error}
            <br />
            Quasar API: {testMutation.data.quasar_api ? "OK" : testMutation.data.quasar_api_error}
          </div>
        )}
      </div>
    </div>
  );
}
