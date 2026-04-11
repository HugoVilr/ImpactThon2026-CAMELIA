import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import i18n from "./i18n";
import { setupStore } from "./store";

type MockState = {
  failJobs: boolean;
  failSubmit: boolean;
  jobs: Array<{
    job_id: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    gpus: number;
    cpus: number;
    memory_gb: number;
    max_runtime_seconds: number;
    fasta_filename: string;
    error_message: string | null;
  }>;
  samples: Array<{
    protein_name: string;
    uniprot_id: string;
    sequence_length: number;
    fasta: string;
  }>;
};

const defaultMockState = (): MockState => ({
  failJobs: false,
  failSubmit: false,
  jobs: [
    {
      job_id: "job_failed_001",
      status: "FAILED",
      created_at: "2026-04-10T19:04:12.232598",
      started_at: "2026-04-10T19:04:17.237785",
      completed_at: "2026-04-10T19:04:22.633668",
      gpus: 1,
      cpus: 8,
      memory_gb: 32,
      max_runtime_seconds: 3600,
      fasta_filename: "ubiquitin.fasta",
      error_message: null,
    },
    {
      job_id: "job_running_002",
      status: "RUNNING",
      created_at: "2026-04-10T20:10:12.232598",
      started_at: "2026-04-10T20:11:17.237785",
      completed_at: null,
      gpus: 2,
      cpus: 16,
      memory_gb: 80,
      max_runtime_seconds: 7200,
      fasta_filename: "spike.fasta",
      error_message: null,
    },
  ],
  samples: [
    {
      protein_name: "Ubiquitin",
      uniprot_id: "P0CG47",
      sequence_length: 76,
      fasta: ">sp|P0CG47|UBQ_HUMAN\nMQIFVKTLTGKTI",
    },
    {
      protein_name: "Insulin Chain A",
      uniprot_id: "P01308",
      sequence_length: 21,
      fasta: ">sp|P01308|INS_HUMAN\nGIVEQCCTSICSLYQLENYCN",
    },
  ],
});

let mockState: MockState = defaultMockState();
let submitRequests: Array<Record<string, unknown>> = [];
let submittedJobStatus: "PENDING" | "RUNNING" | "COMPLETED" | null = null;
let submittedJobPollCount = 0;

const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.endsWith("/jobs/submit")) {
    if (typeof init?.body === "string") {
      submitRequests.push(JSON.parse(init.body) as Record<string, unknown>);
    }

    if (mockState.failSubmit) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ detail: "invalid request" }),
      } as Response;
    }

    submittedJobStatus = "PENDING";
    submittedJobPollCount = 0;

    return {
      ok: true,
      json: async () => ({
        job_id: "job_submitted_123",
        status: "PENDING",
        message: "Job submitted successfully. Use the job_id to check status.",
      }),
    } as Response;
  }

  if (url.endsWith("/health")) {
    return {
      ok: true,
      json: async () => ({
        status: "healthy",
        service: "CESGA Supercomputer Simulator",
        version: "1.0.0",
      }),
    } as Response;
  }

  if (url.includes("/jobs/?limit=20")) {
    if (mockState.failJobs) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ detail: "service unavailable" }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => [...mockState.jobs],
    } as Response;
  }

  const statusMatch = url.match(/\/jobs\/([^/]+)\/status$/);
  if (statusMatch) {
    const jobId = statusMatch[1];

    if (jobId === "job_submitted_123" && submittedJobStatus) {
      submittedJobPollCount += 1;
      if (submittedJobStatus === "PENDING" && submittedJobPollCount >= 2) {
        submittedJobStatus = "RUNNING";
      } else if (submittedJobStatus === "RUNNING" && submittedJobPollCount >= 4) {
        submittedJobStatus = "COMPLETED";
      }

      return {
        ok: true,
        json: async () => ({
          job_id: "job_submitted_123",
          status: submittedJobStatus,
          started_at: submittedJobStatus === "PENDING" ? null : "2026-04-10T22:11:17.237785",
          completed_at: submittedJobStatus === "COMPLETED" ? "2026-04-10T22:19:10.237785" : null,
          error_message: null,
        }),
      } as Response;
    }

    const existingJob = mockState.jobs.find((job) => job.job_id === jobId);
    if (existingJob) {
      return {
        ok: true,
        json: async () => ({
          job_id: existingJob.job_id,
          status: existingJob.status,
          started_at: existingJob.started_at,
          completed_at: existingJob.completed_at,
          error_message: existingJob.error_message,
        }),
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ detail: "Not found" }),
    } as Response;
  }

  if (url.endsWith("/proteins/samples")) {
    return {
      ok: true,
      json: async () => mockState.samples,
    } as Response;
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ detail: "Not found" }),
  } as Response;
});

const renderApp = () => {
  const store = setupStore();

  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
};

beforeEach(async () => {
  mockState = defaultMockState();
  submitRequests = [];
  submittedJobStatus = null;
  submittedJobPollCount = 0;
  vi.stubGlobal("fetch", mockFetch);
  await i18n.changeLanguage("es");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("App Home", () => {
  it("renders home layout and jobs table", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: /biohack localfold/i })).toBeInTheDocument();
    expect(await screen.findByText(/trabajos recientes/i)).toBeInTheDocument();
    expect(await screen.findByText(/ubiquitin/i)).toBeInTheDocument();
    expect(await screen.findByText(/spike/i)).toBeInTheDocument();
  });

  it("filters jobs by running status", async () => {
    renderApp();
    await screen.findByText(/ubiquitin/i);

    fireEvent.click(screen.getByRole("button", { name: /en ejecución/i }));
    expect(await screen.findByText(/spike/i)).toBeInTheDocument();
    expect(screen.queryByText(/ubiquitin/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /todos/i }));
    expect(await screen.findByText(/ubiquitin/i)).toBeInTheDocument();
    expect(await screen.findByText(/spike/i)).toBeInTheDocument();
  });

  it("shows progress bar alongside in-progress button for active jobs", async () => {
    renderApp();
    await screen.findByText(/trabajos recientes/i);

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(1);
    expect(screen.getByRole("button", { name: /en progreso/i })).toBeInTheDocument();
  });

  it("does not render completed jobs from API mock", async () => {
    mockState.jobs = [
      ...mockState.jobs,
      {
        job_id: "job_completed_mock",
        status: "COMPLETED",
        created_at: "2026-04-10T21:10:12.232598",
        started_at: "2026-04-10T21:11:17.237785",
        completed_at: "2026-04-10T21:19:10.237785",
        gpus: 1,
        cpus: 8,
        memory_gb: 32,
        max_runtime_seconds: 3600,
        fasta_filename: "mock.fasta",
        error_message: null,
      },
    ];

    renderApp();
    await screen.findByText(/trabajos recientes/i);

    expect(screen.queryByText(/job_completed_mock/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /completados/i })).not.toBeInTheDocument();
  });

  it("does not render sample or filename fields", async () => {
    renderApp();
    await screen.findByText(/entrada de secuencia/i);

    expect(screen.queryByLabelText(/usar muestra fasta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre de archivo fasta/i)).not.toBeInTheDocument();
  });

  it("uploads a FASTA file from modal", async () => {
    renderApp();
    await screen.findByText(/entrada de secuencia/i);

    fireEvent.click(screen.getByRole("button", { name: /subir \.fasta/i }));

    const file = new File([">protein_demo\nMKTLLIL"], "uploaded.fasta", {
      type: "text/plain",
    });
    Object.defineProperty(file, "text", {
      value: async () => ">protein_demo\nMKTLLIL",
    });

    fireEvent.change(screen.getByLabelText(/seleccionar archivo fasta/i), {
      target: { files: [file] },
    });

    expect(await screen.findByText(/archivo cargado: uploaded\.fasta/i)).toBeInTheDocument();
    expect(screen.queryByText(/subir archivo de secuencia/i)).not.toBeInTheDocument();
    const sequenceTextarea = screen.getByLabelText(/secuencia/i) as HTMLTextAreaElement;
    expect(sequenceTextarea.value).toBe(">protein_demo\nMKTLLIL");
  });

  it("shows error for unsupported upload extension", async () => {
    renderApp();
    await screen.findByText(/entrada de secuencia/i);

    fireEvent.click(screen.getByRole("button", { name: /subir \.fasta/i }));

    const file = new File(["fake"], "not-valid.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", {
      value: async () => "fake",
    });

    fireEvent.change(screen.getByLabelText(/seleccionar archivo fasta/i), {
      target: { files: [file] },
    });

    expect(await screen.findByText(/formato de archivo no compatible/i)).toBeInTheDocument();
  });

  it("shows error for empty upload file", async () => {
    renderApp();
    await screen.findByText(/entrada de secuencia/i);

    fireEvent.click(screen.getByRole("button", { name: /subir \.fasta/i }));

    const file = new File([""], "empty.fasta", { type: "text/plain" });
    Object.defineProperty(file, "text", {
      value: async () => "",
    });

    fireEvent.change(screen.getByLabelText(/seleccionar archivo fasta/i), {
      target: { files: [file] },
    });

    expect(await screen.findByText(/el archivo está vacío/i)).toBeInTheDocument();
  });

  it("submits job with selected resource profile", async () => {
    renderApp();
    const runButton = await screen.findByRole("button", { name: /ejecutar plegamiento/i });

    await waitFor(() => {
      expect(runButton).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /^alta precisión/i }));
    fireEvent.click(runButton);

    expect(await screen.findByText(/job enviado: job_submitted_123/i)).toBeInTheDocument();
    expect(screen.queryByText(/^job_submitted_123$/i)).not.toBeInTheDocument();
    expect(submitRequests).toHaveLength(1);
    expect(submitRequests[0]).toMatchObject({
      gpus: 2,
      cpus: 16,
      memory_gb: 80,
      max_runtime_seconds: 7200,
    });
    expect(String(submitRequests[0].fasta_sequence)).toMatch(/^>/);
  });

  it("polls submitted job status using the job status endpoint", async () => {
    renderApp();
    const runButton = await screen.findByRole("button", { name: /ejecutar plegamiento/i });

    await waitFor(() => {
      expect(runButton).not.toBeDisabled();
    });

    fireEvent.click(runButton);
    expect(await screen.findByText(/job enviado: job_submitted_123/i)).toBeInTheDocument();

    await waitFor(() => {
      const calledStatusEndpoint = mockFetch.mock.calls.some(([input]) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        return url.includes("/jobs/job_submitted_123/status");
      });

      expect(calledStatusEndpoint).toBe(true);
    });
  });

  it("disables submit when FASTA is invalid", async () => {
    renderApp();
    const sequenceTextarea = (await screen.findByLabelText(/secuencia/i)) as HTMLTextAreaElement;
    const runButton = await screen.findByRole("button", { name: /ejecutar plegamiento/i });

    fireEvent.change(sequenceTextarea, { target: { value: "INVALID_FASTA" } });

    expect(runButton).toBeDisabled();
    fireEvent.click(runButton);
    expect(submitRequests).toHaveLength(0);
  });

  it("switches language to english and galician", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /biohack localfold/i });

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(await screen.findByRole("button", { name: /run sequence folding/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GL" }));
    expect(await screen.findByRole("button", { name: /executar pregamento/i })).toBeInTheDocument();
  });

  it("keeps the main hero title stable across language switches", async () => {
    renderApp();
    const heroTitle = await screen.findByRole("heading", { name: /biohack localfold/i });
    expect(heroTitle).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(await screen.findByRole("heading", { name: /biohack localfold/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GL" }));
    expect(await screen.findByRole("heading", { name: /biohack localfold/i })).toBeInTheDocument();
  });

  it("does not render dashboard/analytics/protocol/registry links in the header", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /biohack localfold/i });

    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /analytics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /protocolo|protocol/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /registro|registry/i })).not.toBeInTheDocument();
  });

  it("renders resource presets panel as transparent and borderless", async () => {
    renderApp();
    const presetPanel = await screen.findByTestId("preset-panel");

    expect(presetPanel).toHaveClass("bg-transparent");
    expect(presetPanel).toHaveClass("border-0");
  });

  it("shows dashboard load error when jobs endpoint fails", async () => {
    mockState.failJobs = true;
    renderApp();

    expect(await screen.findByText(/no se pudieron cargar los datos del panel/i)).toBeInTheDocument();
  });
});
