import { useEffect, useState } from "react";

type ApiHealth = {
  status: string;
  service: string;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as ApiHealth;
      })
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((err) => {
        setHealth(null);
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, []);

  return (
    <main className="container">
      <h1>CAMELIA Monorepo</h1>
      <p>Frontend: React + TypeScript</p>
      <p>Backend: FastAPI + Pipenv</p>
      <p>API URL: {apiUrl}</p>

      <section className="status-card">
        <h2>Health check del backend</h2>
        {health && (
          <p>
            {health.service}: <strong>{health.status}</strong>
          </p>
        )}
        {error && <p className="error">Error conectando con backend: {error}</p>}
        {!health && !error && <p>Comprobando estado...</p>}
      </section>
    </main>
  );
}
