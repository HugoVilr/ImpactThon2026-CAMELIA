import { apiUrl } from "../store/actions";
import type { Job } from "../types/domain";
import type { JobAccountingPayload, JobOutputsPayload, JobStatusPayload } from "./types";

const parseHttpError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    // Ignore malformed error responses.
  }

  return `HTTP ${response.status}`;
};

export const fetchJobStatus = async (jobId: string): Promise<JobStatusPayload> => {
  const response = await fetch(`${apiUrl}/jobs/${encodeURIComponent(jobId)}/status`);
  if (!response.ok) {
    throw new Error(await parseHttpError(response));
  }

  return (await response.json()) as JobStatusPayload;
};

export const fetchJobsList = async (limit = 50): Promise<Job[]> => {
  const response = await fetch(`${apiUrl}/jobs/?limit=${encodeURIComponent(String(limit))}`);
  if (!response.ok) {
    throw new Error(await parseHttpError(response));
  }

  return (await response.json()) as Job[];
};

export const fetchJobOutputs = async (jobId: string): Promise<JobOutputsPayload | null> => {
  const response = await fetch(`${apiUrl}/jobs/${encodeURIComponent(jobId)}/outputs`);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as JobOutputsPayload;
};

export const fetchJobAccounting = async (jobId: string): Promise<JobAccountingPayload | null> => {
  const response = await fetch(`${apiUrl}/jobs/${encodeURIComponent(jobId)}/accounting`);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as JobAccountingPayload;
};

export const fetchProteinDetail = async (proteinId: string): Promise<Record<string, unknown> | null> => {
  const response = await fetch(`${apiUrl}/proteins/${encodeURIComponent(proteinId)}`);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
};
