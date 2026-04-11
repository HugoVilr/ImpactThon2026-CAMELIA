import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiHealth, FeedbackMessage, Job, ProteinSample } from "../../types/domain";

export const apiUrl = (
  import.meta.env.VITE_API_URL ?? "https://api-mock-cesga.onrender.com"
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

export const loadDashboard = createAsyncThunk<
  DashboardPayload,
  void,
  { rejectValue: FeedbackMessage }
>("workspace/loadDashboard", async (_, { rejectWithValue }) => {
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
