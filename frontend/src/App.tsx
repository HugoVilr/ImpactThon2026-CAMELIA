import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type ApiHealth = {
  status: string;
  service: string;
  version?: string;
};

type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

type Job = {
  job_id: string;
  status: JobStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  gpus: number;
  cpus: number;
  memory_gb: number;
  max_runtime_seconds: number;
  fasta_filename: string;
  error_message: string | null;
};

type ProteinSample = {
  protein_name: string;
  uniprot_id: string;
  sequence_length: number;
  fasta: string;
};

type SubmitJobResponse = {
  job_id: string;
  status: JobStatus;
  message: string;
};

const apiUrl = (
  import.meta.env.VITE_API_URL ?? "https://api-mock-cesga.onrender.com"
).replace(/\/$/, "");

const parseHttpError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    // Ignore JSON parse failures and fallback to status code.
  }

  return `HTTP ${response.status}`;
};

const readFileAsText = async (file: File): Promise<string> => {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Formato de archivo no compatible."));
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer el archivo."));
    };

    reader.readAsText(file);
  });
};

export default function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [samples, setSamples] = useState<ProteinSample[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fastaSequence, setFastaSequence] = useState("");
  const [preset, setPreset] = useState("Estándar");

  const [fastaSequence, setFastaSequence] = useState("");
  const [fastaFilename, setFastaFilename] = useState("sequence.fasta");
  const [cpus, setCpus] = useState(8);
  const [gpus, setGpus] = useState(1);
  const [memoryGb, setMemoryGb] = useState(32);
  const [maxRuntimeSeconds, setMaxRuntimeSeconds] = useState(3600);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sampleInitialized, setSampleInitialized] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setDashboardError(null);

    try {
      const [healthRes, jobsRes, samplesRes] = await Promise.all([
        fetch(`${apiUrl}/health`),
        fetch(`${apiUrl}/jobs/?limit=20`),
        fetch(`${apiUrl}/proteins/samples`),
      ]);

      if (!healthRes.ok) {
        throw new Error(`Health ${await parseHttpError(healthRes)}`);
      }

      if (!jobsRes.ok) {
        throw new Error(`Jobs ${await parseHttpError(jobsRes)}`);
      }

      if (!samplesRes.ok) {
        throw new Error(`Samples ${await parseHttpError(samplesRes)}`);
      }

      const [healthData, jobsData, sampleData] = await Promise.all([
        healthRes.json() as Promise<ApiHealth>,
        jobsRes.json() as Promise<Job[]>,
        samplesRes.json() as Promise<ProteinSample[]>,
      ]);

      setHealth(healthData);
      setJobs(jobsData);
      setSamples(sampleData);

      if (!sampleInitialized && sampleData.length > 0) {
        setFastaSequence(sampleData[0].fasta);
        setFastaFilename(`${sampleData[0].protein_name.replace(/\s+/g, "_")}.fasta`);
        setSampleInitialized(true);
      }
    } catch (err) {
      setHealth(null);
      setJobs([]);
      setDashboardError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleSampleChange = (sampleIndex: string) => {
    const index = Number(sampleIndex);
    if (Number.isNaN(index) || !samples[index]) {
      return;
    }

    const selectedSample = samples[index];
    setFastaSequence(selectedSample.fasta);
    setFastaFilename(`${selectedSample.protein_name.replace(/\s+/g, "_")}.fasta`);
    setUploadError(null);
    setUploadMessage(null);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) {
      return;
    }

    try {
      const content = await readFileAsText(uploadedFile);
      if (!content.trim()) {
        throw new Error("El archivo está vacío.");
      }

      setFastaSequence(content);
      setFastaFilename(uploadedFile.name);
      setUploadError(null);
      setUploadMessage(`Archivo cargado: ${uploadedFile.name}`);
    } catch (err) {
      setUploadMessage(null);
      setUploadError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmitJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fastaSequence.trim()) {
      setSubmitError("Debes pegar una secuencia FASTA.");
      setSubmitMessage(null);
      return;
    }

    if (!fastaFilename.trim()) {
      setSubmitError("Debes indicar un nombre de archivo FASTA.");
      setSubmitMessage(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await fetch(`${apiUrl}/jobs/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fasta_sequence: fastaSequence.trim(),
          fasta_filename: fastaFilename.trim(),
          gpus,
          cpus,
          memory_gb: memoryGb,
          max_runtime_seconds: maxRuntimeSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseHttpError(response));
      }

      const submitData = (await response.json()) as SubmitJobResponse;
      setSubmitMessage(`Job enviado: ${submitData.job_id} (${submitData.status})`);
      await loadDashboard();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">CESGA API Integration</p>
        <h1>CAMELIA + CESGA Mock API</h1>
        <p className="lead">
          Frontend conectado a <strong>{apiUrl}</strong>. Puedes enviar FASTA al
          simulador y revisar los jobs recibidos por la API.
        </p>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Estado de API</h2>
          {health && (
            <>
              <p>
                {health.service}: <strong>{health.status}</strong>
              </p>
              {health.version && <p className="database-path">version {health.version}</p>}
            </>
          )}
          {dashboardError && <p className="error">Error: {dashboardError}</p>}
          {!health && !dashboardError && <p>Comprobando estado...</p>}
        </section>

        <section className="card">
          <h2>Resumen rápido</h2>
          <p>Total jobs cargados: {jobs.length}</p>
          <p>Samples FASTA disponibles: {samples.length}</p>
          {loading && <p>Cargando datos...</p>}
        </section>
      </div>

      <section className="card">
        <div className="section-header">
          <h2>Enviar Job a CESGA</h2>
          <button type="button" onClick={() => void loadDashboard()} disabled={loading}>
            Recargar datos
          </button>
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

        <form className="entry-form" onSubmit={(event) => void handleSubmitJob(event)}>
          <label htmlFor="sample">
            Usar sample FASTA
            <select id="sample" onChange={(event) => handleSampleChange(event.target.value)}>
              <option value="">Selecciona un sample</option>
              {samples.map((sample, index) => (
                <option key={sample.uniprot_id} value={index}>
                  {sample.protein_name} ({sample.uniprot_id})
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="fasta-file">
            Upload FASTA file
            <input
              id="fasta-file"
              type="file"
              accept=".fasta,.fa,.faa,.txt"
              onChange={(event) => {
                void handleFileUpload(event);
              }}
            />
          </label>

          <label htmlFor="fasta-filename">
            FASTA filename
            <input
              id="fasta-filename"
              type="text"
              value={fastaFilename}
              onChange={(event) => setFastaFilename(event.target.value)}
            />
          </label>

          <label htmlFor="fasta-sequence">
            FASTA sequence
            <textarea
              id="fasta-sequence"
              rows={8}
              value={fastaSequence}
              onChange={(event) => setFastaSequence(event.target.value)}
            />
          </label>

          <div className="grid">
            <label htmlFor="cpus">
              CPUs
              <input
                id="cpus"
                type="number"
                min={1}
                max={64}
                value={cpus}
                onChange={(event) => setCpus(Number(event.target.value))}
              />
            </label>
            <label htmlFor="gpus">
              GPUs
              <input
                id="gpus"
                type="number"
                min={0}
                max={4}
                value={gpus}
                onChange={(event) => setGpus(Number(event.target.value))}
              />
            </label>
            <label htmlFor="memory-gb">
              Memory (GB)
              <input
                id="memory-gb"
                type="number"
                min={1}
                max={256}
                value={memoryGb}
                onChange={(event) => setMemoryGb(Number(event.target.value))}
              />
            </label>
            <label htmlFor="max-runtime">
              Max runtime (s)
              <input
                id="max-runtime"
                type="number"
                min={60}
                max={86400}
                value={maxRuntimeSeconds}
                onChange={(event) => setMaxRuntimeSeconds(Number(event.target.value))}
              />
            </label>
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar job"}
          </button>
        </form>

        {submitError && <p className="error">No se pudo enviar el job: {submitError}</p>}
        {uploadError && <p className="error">Upload error: {uploadError}</p>}
        {uploadMessage && <p>{uploadMessage}</p>}
        {submitMessage && <p>{submitMessage}</p>}
      </section>

      <section className="card">
        <h2>Jobs recientes</h2>
        {jobs.length === 0 ? (
          <p>No hay jobs todavía.</p>
        ) : (
          <div className="entries">
            {jobs.map((job) => (
              <article key={job.job_id} className="entry">
                <div className="entry-meta">
                  <strong>{job.fasta_filename}</strong>
                  <span>{job.status}</span>
                </div>
                <p>Job ID: {job.job_id}</p>
                <p>
                  Recursos: {job.cpus} CPU / {job.gpus} GPU / {job.memory_gb} GB
                </p>
                <small>Creado: {new Date(job.created_at).toLocaleString()}</small>
                {job.error_message && <p className="error">Error: {job.error_message}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
