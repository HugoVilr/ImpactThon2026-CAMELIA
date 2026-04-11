import type { Job, JobStatus, LanguageCode } from "../types/domain";

export const statusTranslationKey: Record<JobStatus, string> = {
  PENDING: "status.pending",
  RUNNING: "status.running",
  COMPLETED: "status.completed",
  FAILED: "status.failed",
  CANCELLED: "status.cancelled",
};

const localeByLanguage: Record<LanguageCode, string> = {
  es: "es-ES",
  en: "en-US",
  gl: "gl-ES",
};

export const resourceKeyForJob = (job: Job): string => {
  if (job.gpus === 0) {
    return "resource.draft";
  }

  if (job.gpus >= 2 || job.memory_gb >= 64) {
    return "resource.highPrecision";
  }

  return "resource.standard";
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const displayJobName = (job: Job): string => {
  const withoutExtension = job.fasta_filename.replace(/\.(fasta|fa|faa|txt)$/i, "").trim();
  if (!withoutExtension) {
    return "sequence";
  }

  const idSuffix = new RegExp(`([_\\-\\s]?${escapeRegExp(job.job_id)})$`, "i");
  return withoutExtension.replace(idSuffix, "").trim() || withoutExtension;
};

export const resolveLanguage = (value: string | undefined): LanguageCode => {
  if (value === "en" || value === "es" || value === "gl") {
    return value;
  }

  return "es";
};

export const localeForLanguage = (language: LanguageCode): string => {
  return localeByLanguage[language];
};

export const FASTA_VALID_SEQ_REGEX = /^[ACDEFGHIKLMNPQRSTVWXYacdefghiklmnpqrstvwxy\s\*\-]+$/;

export const isValidFasta = (fasta: string): boolean => {
  const lines = fasta.trim().split("\n");
  if (lines.length === 0 || !lines[0].startsWith(">")) {
    return false;
  }

  const sequence = lines.slice(1).join("").trim();
  if (sequence.length === 0) {
    return false;
  }

  return FASTA_VALID_SEQ_REGEX.test(sequence);
};
