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

export const resolveLanguage = (value: string | undefined): LanguageCode => {
  if (value === "en" || value === "es" || value === "gl") {
    return value;
  }

  return "es";
};

export const localeForLanguage = (language: LanguageCode): string => {
  return localeByLanguage[language];
};
