import { apiUrl } from "../store/actions";
import type { JobStatusPayload, JobOutputsPayload } from "./types";

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

export const fetchJobOutputs = async (jobId: string): Promise<JobOutputsPayload | null> => {
  const response = await fetch(`${apiUrl}/jobs/${encodeURIComponent(jobId)}/outputs`);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as JobOutputsPayload;
};
