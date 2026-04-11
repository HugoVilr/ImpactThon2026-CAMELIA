export type ApiHealth = {
  status: string;
  service: string;
  version?: string;
};

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type Job = {
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

export type ProteinSample = {
  protein_name: string;
  uniprot_id: string;
  sequence_length: number;
  fasta: string;
};

export type SubmitJobResponse = {
  job_id: string;
  status: JobStatus;
  message: string;
};

export type ResourcePresetId = "draft" | "standard" | "precision";

export type ResourcePreset = {
  id: ResourcePresetId;
  nameKey: string;
  subtitleKey: string;
  descriptionKey: string;
  badgeKey?: string;
  cpus: number;
  gpus: number;
  memoryGb: number;
  maxRuntimeSeconds: number;
};

export type JobFilter = "all" | "running" | "completed";

export type LanguageCode = "es" | "en" | "gl";

export type FeedbackMessage = {
  key: string;
  params?: Record<string, string>;
};
