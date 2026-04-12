import { createAsyncThunk } from "@reduxjs/toolkit";
import { getPresetById } from "../../config/presets";
import type {
  ApiHealth,
  FeedbackMessage,
  Job,
  JobStatus,
  ProteinSample,
  ResourcePresetId,
  SubmitJobResponse,
} from "../../types/domain";

export const apiUrl = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "/api" : "https://api-mock-cesga.onrender.com")
).replace(/\/$/, "");

const allowedExtensions = [".fasta", ".fa", ".faa", ".txt"];

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

      reject(new Error("errors.fileFormat"));
    };

    reader.onerror = () => {
      reject(new Error("errors.uploadRead"));
    };

    reader.readAsText(file);
  });
};

export type DashboardPayload = {
  health: ApiHealth;
  jobs: Job[];
  samples: ProteinSample[];
};

export type UploadedFilePayload = {
  filename: string;
  content: string;
};

export type SubmitFoldingJobArgs = {
  fastaSequence: string;
  fastaFilename: string;
  presetId: ResourcePresetId;
};

export type PollJobStatusesArgs = {
  jobIds: string[];
};

export type JobStatusUpdate = {
  job_id: string;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
};

const validStatuses: JobStatus[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

const normalizeJobStatus = (value: unknown): JobStatus | null =>
  typeof value === "string" && validStatuses.includes(value as JobStatus)
    ? (value as JobStatus)
    : null;

export const loadDashboard = createAsyncThunk<
  DashboardPayload,
  void,
  { rejectValue: FeedbackMessage }
>("workspace/loadDashboard", async (_, { rejectWithValue }) => {
  try {
    const [healthRes, jobsRes, samplesRes] = await Promise.all([
      fetch(`${apiUrl}/health`),
      fetch(`${apiUrl}/jobs/?limit=50`),
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

    const [health, jobs, samples] = await Promise.all([
      healthRes.json() as Promise<ApiHealth>,
      jobsRes.json() as Promise<Job[]>,
      samplesRes.json() as Promise<ProteinSample[]>,
    ]);

    return { health, jobs, samples };
  } catch (error) {
    return rejectWithValue({
      key: "errors.dashboardLoad",
      params: {
        detail: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

export const processUploadFile = createAsyncThunk<
  UploadedFilePayload,
  File,
  { rejectValue: FeedbackMessage }
>("workspace/processUploadFile", async (file, { rejectWithValue }) => {
  const lowerFile = file.name.toLowerCase();
  const extensionAllowed = allowedExtensions.some((extension) => lowerFile.endsWith(extension));

  if (!extensionAllowed) {
    return rejectWithValue({ key: "errors.fileFormat" });
  }

  try {
    const content = await readFileAsText(file);
    if (!content.trim()) {
      return rejectWithValue({ key: "errors.uploadEmpty" });
    }

    return {
      filename: file.name,
      content,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("errors.")) {
      return rejectWithValue({ key: error.message });
    }

    return rejectWithValue({ key: "errors.uploadRead" });
  }
});

export const submitFoldingJob = createAsyncThunk<
  SubmitJobResponse,
  SubmitFoldingJobArgs,
  { rejectValue: FeedbackMessage }
>("workspace/submitFoldingJob", async (payload, { rejectWithValue }) => {
  const fastaSequence = payload.fastaSequence.trim();
  if (!fastaSequence || !fastaSequence.startsWith(">")) {
    return rejectWithValue({ key: "errors.invalidFasta" });
  }

  const preset = getPresetById(payload.presetId);
  const fastaFilename = payload.fastaFilename.trim() || "sequence.fasta";

  try {
    const response = await fetch(`${apiUrl}/jobs/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fasta_sequence: fastaSequence,
        fasta_filename: fastaFilename,
        gpus: preset.gpus,
        cpus: preset.cpus,
        memory_gb: preset.memoryGb,
        max_runtime_seconds: preset.maxRuntimeSeconds,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseHttpError(response));
    }

    return (await response.json()) as SubmitJobResponse;
  } catch (error) {
    return rejectWithValue({
      key: "errors.jobSubmit",
      params: {
        detail: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

export const pollJobStatuses = createAsyncThunk<JobStatusUpdate[], PollJobStatusesArgs>(
  "workspace/pollJobStatuses",
  async ({ jobIds }) => {
    const uniqueJobIds = Array.from(new Set(jobIds.map((id) => id.trim()).filter(Boolean)));
    if (uniqueJobIds.length === 0) {
      return [];
    }

    const statusChecks = await Promise.all(
      uniqueJobIds.map(async (jobId) => {
        try {
          const response = await fetch(`${apiUrl}/jobs/${jobId}/status`);
          if (!response.ok) {
            return null;
          }

          const payload = (await response.json()) as Partial<JobStatusUpdate>;
          const status = normalizeJobStatus(payload.status);
          if (!status) {
            return null;
          }

          return {
            job_id: jobId,
            status,
            started_at: typeof payload.started_at === "string" ? payload.started_at : null,
            completed_at: typeof payload.completed_at === "string" ? payload.completed_at : null,
            error_message: typeof payload.error_message === "string" ? payload.error_message : null,
          } satisfies JobStatusUpdate;
        } catch {
          return null;
        }
      })
    );

    return statusChecks.filter((entry): entry is JobStatusUpdate => entry !== null);
  }
);
