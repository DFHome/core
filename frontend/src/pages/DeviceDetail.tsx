import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiErrorMessage, endpoints } from "../api/client";
import DeviceCard from "../components/DeviceCard";

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["device", id],
    queryFn: () => endpoints.getDevice(id!),
    enabled: Boolean(id),
    refetchInterval: 10000,
  });

  return (
    <div>
      <p>
        <Link to="/">&larr; Ко всем устройствам</Link>
      </p>
      {isLoading && <p className="loading">Загрузка…</p>}
      {error && <div className="banner error">{apiErrorMessage(error)}</div>}
      {data && (
        <div style={{ maxWidth: 360 }}>
          <DeviceCard device={data} />
        </div>
      )}
    </div>
  );
}
