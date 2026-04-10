import { FormEvent, useEffect, useState } from "react";

type ApiHealth = {
  status: string;
  service: string;
  database: string;
};

type Entry = {
  id: number;
  title: string;
  category: string;
  description: string;
  created_at: string;
};

type EntryForm = {
  title: string;
  category: string;
  description: string;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const initialForm: EntryForm = {
  title: "",
  category: "",
  description: "",
};

export default function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState<EntryForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);

    try {
      const [healthRes, entriesRes] = await Promise.all([
        fetch(`${apiUrl}/health`),
        fetch(`${apiUrl}/api/entries`),
      ]);

      if (!healthRes.ok) {
        throw new Error(`Health HTTP ${healthRes.status}`);
      }

      if (!entriesRes.ok) {
        throw new Error(`Entries HTTP ${entriesRes.status}`);
      }

      const [healthData, entriesData] = await Promise.all([
        healthRes.json() as Promise<ApiHealth>,
        entriesRes.json() as Promise<Entry[]>,
      ]);

      setHealth(healthData);
      setEntries(entriesData);
      setError(null);
    } catch (err) {
      setHealth(null);
      setEntries([]);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`${apiUrl}/api/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Create HTTP ${response.status}`);
      }

      const createdEntry = (await response.json()) as Entry;
      setEntries((currentEntries) => [createdEntry, ...currentEntries]);
      setForm(initialForm);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">CAMELIA local stack</p>
        <h1>Frontend y backend ya pueden leer y escribir en una base local.</h1>
        <p className="lead">
          La API usa PostgreSQL local y DBeaver puede conectarse con los datos
          que el backend expone en el health check.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Estado de conexión</h2>
          <p>API URL: {apiUrl}</p>
          {health && (
            <>
              <p>
                Backend: <strong>{health.status}</strong>
              </p>
              <p className="database-path">{health.database}</p>
            </>
          )}
          {loading && <p>Cargando conexión...</p>}
          {error && <p className="error">Error: {error}</p>}
        </article>

        <article className="card">
          <h2>Crear registro</h2>
          <form className="entry-form" onSubmit={handleSubmit}>
            <input
              placeholder="Título"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
            <input
              placeholder="Categoría"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              required
            />
            <textarea
              placeholder="Descripción"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              required
              rows={4}
            />
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar en PostgreSQL"}
            </button>
          </form>
        </article>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Datos guardados</h2>
          <button type="button" onClick={() => void loadData()} disabled={loading}>
            Recargar
          </button>
        </div>

        {!loading && entries.length === 0 && (
          <p>No hay registros todavía. Crea uno desde el formulario.</p>
        )}

        <div className="entries">
          {entries.map((entry) => (
            <article className="entry" key={entry.id}>
              <div className="entry-meta">
                <strong>{entry.title}</strong>
                <span>{entry.category}</span>
              </div>
              <p>{entry.description}</p>
              <small>{new Date(entry.created_at).toLocaleString()}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
