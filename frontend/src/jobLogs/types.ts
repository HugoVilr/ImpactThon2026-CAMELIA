import type { Job, JobStatus } from "../types/domain";

export type JobLogLevel = "info" | "progress" | "warning" | "error";

export type JobLogEntry = {
  id: string;
  timestamp: string;
  message: string;
  level: JobLogLevel;
};

export type JobOutputsPayload = {
  job_id: string;
  status: JobStatus;
  logs?: string;
};

export type JobProgressPhase =
  | "init"
  | "queue"
  | "msa"
  | "features"
  | "folding"
  | "complete"
  | "failed"
  | "cancelled";

export type JobProgressViewModel = {
  titleKey: string;
  percent: number;
  indeterminate: boolean;
  currentStep: number;
  totalSteps: number;
  phase: JobProgressPhase;
  toneClass: string;
};

export type JobStatusPayload = Job;
