import { ChangeEvent, useEffect, useState } from "react";

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

type FileStatus = "pending" | "uploaded" | "processing";

type UploadedFile = {
  file: File;
  uploadDate: Date;
  status: FileStatus;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fastaSequence, setFastaSequence] = useState("");
  const [preset, setPreset] = useState("Estándar");

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
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
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }

    const newDocs: UploadedFile[] = Array.from(event.target.files).map((file) => ({
      file,
      uploadDate: new Date(),
      status: "pending",
    }));

    setFiles((currentFiles) => [...currentFiles, ...newDocs]);
  };

  return (
    <main className="container">
      <h1>CAMELIA Monorepo</h1>
      <p>Frontend: React + TypeScript</p>
      <p>Backend: FastAPI + Pipenv</p>
      <p>API URL: {apiUrl}</p>

      <section className="status-card card">
        <h2>Health check del backend</h2>
        {health && (
          <>
            <p>
              {health.service}: <strong>{health.status}</strong>
            </p>
            <p className="database-path">{health.database}</p>
          </>
        )}
        {error && <p className="error">Error conectando con backend: {error}</p>}
        {!health && !error && <p>Comprobando estado...</p>}
      </section>

      <section className="upload-card">
        <h2>Análisis FASTA</h2>
        
        <div className="preset-selector">
          {["Vista rápida", "Estándar", "Alta precisión"].map((option) => (
            <button
              key={option}
              className={`preset-btn ${preset === option ? "active" : ""}`}
              onClick={() => setPreset(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <textarea
          className="fasta-input"
          placeholder="Pega aquí tu secuencia FASTA (ej. >MiProteina\nMASNDYT...)"
          value={fastaSequence}
          onChange={(e) => setFastaSequence(e.target.value)}
        />
      </section>

      <section className="upload-card">
        <h2>Subir Archivos</h2>
        <div className="upload-container">
          <label htmlFor="file-upload" className="custom-file-upload">
            Seleccionar documentos
          </label>
          <input id="file-upload" type="file" multiple onChange={handleFileUpload} />
        </div>

        {files.length > 0 && (
          <div className="file-list-container">
            <h3>Archivos subidos ({files.length})</h3>
            <ul className="file-list">
              {files.map((doc, index) => (
                <li key={`${doc.file.name}-${index}`} className="file-item">
                  <div className="file-info">
                    <span className="file-name">{doc.file.name}</span>
                    <span className="file-meta">
                      {(doc.file.size / 1024).toFixed(2)} KB •{" "}
                      {doc.uploadDate.toLocaleString()}
                    </span>
                  </div>
                  <span className={`status-badge status-${doc.status}`}>
                    {doc.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Registros en base de datos</h2>
        {entries.length === 0 ? (
          <p>No hay registros todavía.</p>
        ) : (
          <div className="entries">
            {entries.map((entry) => (
              <article key={entry.id} className="entry">
                <div className="entry-meta">
                  <strong>{entry.title}</strong>
                  <span>{entry.category}</span>
                </div>
                <p>{entry.description}</p>
                <small>{new Date(entry.created_at).toLocaleString()}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
