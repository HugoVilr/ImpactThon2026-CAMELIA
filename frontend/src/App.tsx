import { useEffect, useState } from "react";

type ApiHealth = {
  status: string;
  service: string;
};

type FileStatus = "pending" | "uploaded" | "processing"; // Pools listos para el futuro

export type UploadedFile = {
  file: File;
  uploadDate: Date;
  status: FileStatus;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fastaSequence, setFastaSequence] = useState("");
  const [preset, setPreset] = useState("Estándar");

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newDocs: UploadedFile[] = Array.from(event.target.files).map((file) => ({
        file: file,
        uploadDate: new Date(),
        status: "pending",
      }));
      setFiles((prevFiles) => [...prevFiles, ...newDocs]);
    }
  };

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
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
          />
        </div>

        {files.length > 0 && (
          <div className="file-list-container">
            <h3>Archivos subidos ({files.length}):</h3>
            <ul className="file-list">
              {files.map((doc, index) => (
                <li key={index} className="file-item">
                  <div className="file-info">
                    <span className="file-name">{doc.file.name}</span>
                    <span className="file-meta">
                      {(doc.file.size / 1024).toFixed(2)} KB • {doc.uploadDate.toLocaleString()}
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
    </main>
  );
}
