import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import i18n from "./i18n";
import { setupStore } from "./store";

const { mockRequestXrSession } = vi.hoisted(() => ({
  mockRequestXrSession: vi.fn(),
}));

vi.mock("./components/ProteinViewer", async () => {
  const React = await import("react");

  return {
    ProteinViewer: React.forwardRef<
      { requestXrSession: (mode: "immersive-ar" | "immersive-vr") => Promise<void> },
      { structureData: string | null; onReadyChange?: (isReady: boolean) => void }
    >(function MockProteinViewer({ structureData, onReadyChange }, ref) {
      React.useEffect(() => {
        onReadyChange?.(Boolean(structureData));
      }, [onReadyChange, structureData]);

      React.useImperativeHandle(ref, () => ({
        requestXrSession: mockRequestXrSession,
      }));

      return <div data-testid="protein-viewer">{structureData ?? "viewer-empty"}</div>;
    }),
  };
});

type MockState = {
  failJobs: boolean;
  failSubmit: boolean;
  failProteinDetail: boolean;
  failOutputs: boolean;
  proteinDetail: {
    protein_name: string;
    fasta_ready: string;
  };
  submittedJobTerminalStatus: "COMPLETED" | "FAILED" | "CANCELLED";
  submittedJobErrorMessage: string | null;
  jobOutputs: {
    job_id?: string;
    status?: "COMPLETED";
    protein_metadata?: {
      identified_protein?: string | null;
      uniprot_id?: string | null;
      pdb_id?: string | null;
      protein_name?: string | null;
      organism?: string | null;
      description?: string | null;
    };
    structural_data: {
      pdb_file: string | null;
      cif_file: string | null;
      confidence?: Record<string, unknown>;
    };
    biological_data?: Record<string, unknown>;
    logs?: string;
  };
  jobAccounting: {
    job_id: string;
    status: "COMPLETED";
    accounting: {
      cpu_hours: number;
      gpu_hours: number;
      memory_gb_hours: number;
      total_wall_time_seconds: number;
      cpu_efficiency_percent: number;
      memory_efficiency_percent: number;
      gpu_efficiency_percent: number | null;
    };
  };
  compareJobOutputs: Record<
    string,
    {
      job_id?: string;
      status?: "COMPLETED";
      protein_metadata?: {
        identified_protein?: string | null;
        uniprot_id?: string | null;
        pdb_id?: string | null;
        protein_name?: string | null;
        organism?: string | null;
        description?: string | null;
      };
      structural_data: {
        pdb_file: string | null;
        cif_file: string | null;
        confidence?: Record<string, unknown>;
      };
      biological_data?: Record<string, unknown>;
      logs?: string;
    }
  >;
  compareJobAccounting: Record<
    string,
    {
      job_id: string;
      status: "COMPLETED";
      accounting: {
        cpu_hours: number;
        gpu_hours: number;
        memory_gb_hours: number;
        total_wall_time_seconds: number;
        cpu_efficiency_percent: number;
        memory_efficiency_percent: number;
        gpu_efficiency_percent: number | null;
      };
    }
  >;
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
  failProteinDetail: false,
  failOutputs: false,
  proteinDetail: {
    protein_name: "Ubiquitin",
    fasta_ready:
      ">sp|P0CG47|UBIQUITIN Ubiquitin OS=Homo sapiens\nMQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG",
  },
  submittedJobTerminalStatus: "COMPLETED",
  submittedJobErrorMessage: null,
  jobOutputs: {
    job_id: "job_completed_003",
    status: "COMPLETED",
    protein_metadata: {
      identified_protein: "ubiquitin",
      uniprot_id: "P0CG47",
      pdb_id: "1UBQ",
      protein_name: "Ubiquitin",
      organism: "Homo sapiens",
      description: "Small regulatory protein involved in protein degradation.",
    },
    structural_data: {
      pdb_file: null,
      cif_file: "data_demo_ubiquitin\n#\n",
      confidence: {
        plddt_histogram: {
          low: 10,
          medium: 22,
          high: 30,
          very_high: 14,
        },
        pae_matrix: [
          [1, 2, 3, 4],
          [2, 1, 5, 6],
          [3, 5, 1, 2],
          [4, 6, 2, 1],
        ],
        mean_pae: 3.34,
        plddt_mean: 72.1,
      },
    },
    biological_data: {
      solubility_score: 76.0,
      instability_index: 24.88,
      stability_status: "stable",
      toxicity_alerts: ["Potential signal peptide detected"],
      allergenicity_alerts: [],
      secondary_structure_prediction: {
        helix_percent: 23.7,
        strand_percent: 14.5,
        coil_percent: 61.8,
      },
      sequence_properties: {
        length: 76,
        molecular_weight_kda: 8.4,
        positive_charges: 11,
        negative_charges: 11,
        cysteine_residues: 0,
        aromatic_residues: 3,
      },
      source: "synthetic_prediction",
    },
    logs: "[INFO] Model evaluation complete",
  },
  jobAccounting: {
    job_id: "job_completed_003",
    status: "COMPLETED",
    accounting: {
      cpu_hours: 0.006,
      gpu_hours: 0.001,
      memory_gb_hours: 0.031,
      total_wall_time_seconds: 5,
      cpu_efficiency_percent: 56.3,
      memory_efficiency_percent: 70.1,
      gpu_efficiency_percent: 89.7,
    },
  },
  compareJobOutputs: {
    job_completed_004: {
      job_id: "job_completed_004",
      status: "COMPLETED",
      protein_metadata: {
        identified_protein: "calmodulin",
        uniprot_id: "P62158",
        pdb_id: "1CLL",
        protein_name: "Calmodulin",
        organism: "Homo sapiens",
        description: "Calcium-binding messenger protein.",
      },
      structural_data: {
        pdb_file: null,
        cif_file: "data_demo_calmodulin\n#\n",
        confidence: {
          plddt_histogram: {
            low: 6,
            medium: 12,
            high: 41,
            very_high: 18,
          },
        },
      },
      biological_data: {
        solubility_score: 81.2,
        instability_index: 19.8,
        stability_status: "stable",
        toxicity_alerts: [],
        allergenicity_alerts: [],
        source: "catalog_prediction",
      },
      logs: "[INFO] Calmodulin model complete",
    },
  },
  compareJobAccounting: {
    job_completed_004: {
      job_id: "job_completed_004",
      status: "COMPLETED",
      accounting: {
        cpu_hours: 0.008,
        gpu_hours: 0.001,
        memory_gb_hours: 0.028,
        total_wall_time_seconds: 6,
        cpu_efficiency_percent: 61.4,
        memory_efficiency_percent: 71.2,
        gpu_efficiency_percent: 90.1,
      },
    },
  },
  jobs: [
    {
      job_id: "job_completed_003",
      status: "COMPLETED",
      created_at: "2026-04-10T18:10:12.232598",
      started_at: "2026-04-10T18:11:17.237785",
      completed_at: "2026-04-10T18:19:10.237785",
      gpus: 1,
      cpus: 8,
      memory_gb: 32,
      max_runtime_seconds: 3600,
      fasta_filename: "ubiquitin.fasta",
      error_message: null,
    },
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
    {
      job_id: "job_completed_004",
      status: "COMPLETED",
      created_at: "2026-04-10T21:15:12.232598",
      started_at: "2026-04-10T21:16:17.237785",
      completed_at: "2026-04-10T21:22:10.237785",
      gpus: 1,
      cpus: 8,
      memory_gb: 32,
      max_runtime_seconds: 3600,
      fasta_filename: "ubiquitin.fasta",
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
let submittedJobStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | null = null;
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

  if (url.includes("/jobs/?limit=20") || url.includes("/jobs/?limit=50")) {
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

  if (url.endsWith("/proteins/ubiquitin")) {
    if (mockState.failProteinDetail) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ detail: "protein unavailable" }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => mockState.proteinDetail,
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
        submittedJobStatus = mockState.submittedJobTerminalStatus;
      }

      return {
        ok: true,
        json: async () => ({
          job_id: "job_submitted_123",
          status: submittedJobStatus,
          started_at: submittedJobStatus === "PENDING" ? null : "2026-04-10T22:11:17.237785",
          completed_at:
            submittedJobStatus === "COMPLETED" ||
            submittedJobStatus === "FAILED" ||
            submittedJobStatus === "CANCELLED"
              ? "2026-04-10T22:19:10.237785"
              : null,
          error_message:
            submittedJobStatus === "FAILED" || submittedJobStatus === "CANCELLED"
              ? mockState.submittedJobErrorMessage
              : null,
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
          created_at: existingJob.created_at,
          started_at: existingJob.started_at,
          completed_at: existingJob.completed_at,
          gpus: existingJob.gpus,
          cpus: existingJob.cpus,
          memory_gb: existingJob.memory_gb,
          max_runtime_seconds: existingJob.max_runtime_seconds,
          fasta_filename: existingJob.fasta_filename,
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

  if (url.endsWith("/jobs/job_submitted_123/outputs")) {
    if (mockState.failOutputs) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ detail: "outputs unavailable" }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => mockState.jobOutputs,
    } as Response;
  }

  if (url.endsWith("/jobs/job_completed_003/outputs")) {
    return {
      ok: true,
      json: async () => mockState.jobOutputs,
    } as Response;
  }

  if (url.endsWith("/jobs/job_completed_003/accounting")) {
    return {
      ok: true,
      json: async () => mockState.jobAccounting,
    } as Response;
  }

  const compareOutputsMatch = url.match(/\/jobs\/([^/]+)\/outputs$/);
  if (compareOutputsMatch) {
    const jobId = compareOutputsMatch[1];
    const payload = mockState.compareJobOutputs[jobId];
    if (payload) {
      return {
        ok: true,
        json: async () => payload,
      } as Response;
    }
  }

  const compareAccountingMatch = url.match(/\/jobs\/([^/]+)\/accounting$/);
  if (compareAccountingMatch) {
    const jobId = compareAccountingMatch[1];
    const payload = mockState.compareJobAccounting[jobId];
    if (payload) {
      return {
        ok: true,
        json: async () => payload,
      } as Response;
    }
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

const renderApp = (pathname?: string) => {
  if (pathname) {
    window.history.pushState({}, "", pathname);
  }
  const store = setupStore();

  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
};

const setMockXrSupport = (support: { ar: boolean; vr: boolean }) => {
  Object.defineProperty(window.navigator, "xr", {
    configurable: true,
    value: {
      isSessionSupported: vi.fn(async (mode: "immersive-ar" | "immersive-vr") =>
        mode === "immersive-ar" ? support.ar : support.vr
      ),
      requestSession: vi.fn(),
    },
  });
};

const resolveTestXrDemo = async () => {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
  }
};

beforeEach(async () => {
  window.history.replaceState({}, "", "/");
  mockState = defaultMockState();
  submitRequests = [];
  submittedJobStatus = null;
  submittedJobPollCount = 0;
  mockRequestXrSession.mockReset();
  mockRequestXrSession.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", mockFetch);
  Object.defineProperty(window.navigator, "xr", {
    configurable: true,
    value: undefined,
  });
  await i18n.changeLanguage("es");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("App Home", () => {
  it("renders dedicated job logs page route", async () => {
    window.history.replaceState({}, "", "/jobs/job_running_002/logs");
    renderApp();

    expect(await screen.findByText(/scientific job logs/i)).toBeInTheDocument();
    expect(await screen.findByText(/active project|proyecto activo/i)).toBeInTheDocument();
    expect(screen.queryByText(/entrada de secuencia/i)).not.toBeInTheDocument();
  });

  it("renders home layout and jobs table", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: /entrada y configuración/i })).toBeInTheDocument();
    expect(await screen.findByText(/trabajos recientes/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/ubiquitin/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/spike/i)).toBeInTheDocument();
  });

  it("renders completed job results page route", async () => {
    window.history.replaceState({}, "", "/jobs/job_completed_003");
    renderApp();

    expect(await screen.findByRole("button", { name: /visor/i })).toBeInTheDocument();
    expect(await screen.findByText(/global plddt avg/i)).toBeInTheDocument();
    expect(await screen.findByText(/molecular metadata|metadatos moleculares/i)).toBeInTheDocument();
  });

  it("renders the compare subpage and loads the job history on the right column", async () => {
    window.history.replaceState({}, "", "/jobs/job_completed_003/compare");
    renderApp();

    expect(await screen.findByText(/comparación de proteínas/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /comparar spike/i })).toBeInTheDocument();
  });

  it("loads the selected protein into the right comparison column", async () => {
    window.history.replaceState({}, "", "/jobs/job_completed_003/compare");
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: /comparar spike/i }));

    expect(await screen.findByText(/proteína comparada/i)).toBeInTheDocument();
    expect(await screen.findAllByText(/spike/i)).not.toHaveLength(0);
    expect(await screen.findByRole("button", { name: /cambiar proteína/i })).toBeInTheDocument();
  });

  it("uses the identified protein name in the comparison list when it differs from the fasta filename", async () => {
    window.history.replaceState({}, "", "/jobs/job_completed_003/compare");
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: /comparar calmodulin/i }));

    expect(await screen.findByRole("heading", { name: /calmodulin/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /cambiar proteína/i })).toBeInTheDocument();
  });

  it("uses the resolved protein name in the dashboard job list when outputs differ from the fasta filename", async () => {
    renderApp();

    const calmodulinLinks = await screen.findAllByRole("link", { name: /calmodulin/i });
    expect(calmodulinLinks.some((link) => link.getAttribute("href") === "/jobs/job_completed_004")).toBe(true);
  });

  it("filters jobs by running status", async () => {
    renderApp();
    await screen.findAllByText(/ubiquitin/i);

    fireEvent.click(screen.getByRole("button", { name: /en ejecución/i }));
    expect(await screen.findByText(/spike/i)).toBeInTheDocument();
    expect(screen.queryAllByText(/ubiquitin/i)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /todos/i }));
    expect((await screen.findAllByText(/ubiquitin/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/spike/i)).toBeInTheDocument();
  });

  it("shows progress bar alongside in-progress button for active jobs", async () => {
    renderApp();
    await screen.findByText(/trabajos recientes/i);

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(1);
    expect(screen.getByRole("button", { name: /en progreso/i })).toBeInTheDocument();
  });

  it("renders completed jobs from API mock and exposes results navigation", async () => {
    renderApp();
    await screen.findByText(/trabajos recientes/i);

    expect(screen.getAllByRole("link", { name: /ubiquitin/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /completados/i })).toBeInTheDocument();
    const resultLinks = screen.getAllByRole("link", { name: /ver resultados/i });
    expect(resultLinks.some((link) => link.getAttribute("href") === "/jobs/job_completed_003")).toBe(true);
  });

  it("does not render sample or filename fields", async () => {
    renderApp();
    await screen.findByText(/entrada y configuración/i);

    expect(screen.queryByLabelText(/usar muestra fasta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nombre de archivo fasta/i)).not.toBeInTheDocument();
  });

  it("uploads a FASTA file from modal", async () => {
    renderApp();
    await screen.findByText(/entrada y configuración/i);

    fireEvent.click(screen.getByRole("button", { name: /subir archivo/i }));

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
    await screen.findByText(/entrada y configuración/i);

    fireEvent.click(screen.getByRole("button", { name: /subir archivo/i }));

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
    await screen.findByText(/entrada y configuración/i);

    fireEvent.click(screen.getByRole("button", { name: /subir archivo/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /^(alta precisión|máximo detalle)/i }));
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
    await screen.findByRole("heading", { name: /entrada y configuración/i });

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(await screen.findByRole("button", { name: /run sequence folding/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GL" }));
    expect(await screen.findByRole("button", { name: /executar pregamento/i })).toBeInTheDocument();
  });

  it("updates the workspace title across language switches", async () => {
    renderApp();
    expect(await screen.findByRole("heading", { name: /entrada y configuración/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(await screen.findByRole("heading", { name: /input & setup/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GL" }));
    expect(await screen.findByRole("heading", { name: /entrada e configuración/i })).toBeInTheDocument();
  });

  it("does not render dashboard/analytics/protocol/registry links in the header", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /entrada y configuración/i });

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

describe("Test XR Route", () => {
  it("renders the dedicated /test-xr route instead of the home dashboard", async () => {
    renderApp("/test-xr");

    expect(await screen.findByRole("heading", { name: /mol\* xr test/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /biohack localfold/i })).not.toBeInTheDocument();
  });

  it("loads the live demo structure and keeps XR buttons disabled when WebXR is unavailable", async () => {
    vi.useFakeTimers();
    renderApp("/test-xr");

    await resolveTestXrDemo();

    expect(screen.getByText(/data_demo_ubiquitin/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter ar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /enter vr/i })).toBeDisabled();
  }, 10000);

  it("enables only the supported XR mode buttons", async () => {
    vi.useFakeTimers();
    setMockXrSupport({ ar: true, vr: false });
    renderApp("/test-xr");

    await resolveTestXrDemo();

    expect(screen.getByText(/data_demo_ubiquitin/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter ar/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /enter vr/i })).toBeDisabled();
  }, 10000);

  it("requests the matching XR session mode from the shared viewer", async () => {
    vi.useFakeTimers();
    setMockXrSupport({ ar: true, vr: true });
    renderApp("/test-xr");

    await resolveTestXrDemo();

    fireEvent.click(screen.getByRole("button", { name: /enter ar/i }));
    fireEvent.click(screen.getByRole("button", { name: /enter vr/i }));

    expect(mockRequestXrSession).toHaveBeenNthCalledWith(1, "immersive-ar");
    expect(mockRequestXrSession).toHaveBeenNthCalledWith(2, "immersive-vr");
  }, 10000);

  it("shows a clear error when the documented protein fetch fails", async () => {
    mockState.failProteinDetail = true;
    renderApp("/test-xr");

    expect(await screen.findByText(/protein fetch failed/i)).toBeInTheDocument();
  });

  it("shows a clear error when the live demo job fails", async () => {
    vi.useFakeTimers();
    mockState.submittedJobTerminalStatus = "FAILED";
    mockState.submittedJobErrorMessage = "mock folding failure";
    renderApp("/test-xr");

    await resolveTestXrDemo();

    expect(screen.getByText(/mock folding failure/i)).toBeInTheDocument();
  }, 10000);

  it("shows a clear error when outputs are missing both PDB and CIF structure data", async () => {
    vi.useFakeTimers();
    mockState.jobOutputs.structural_data = {
      pdb_file: null,
      cif_file: null,
    };
    renderApp("/test-xr");

    await resolveTestXrDemo();

    expect(screen.getByText(/returned no pdb or cif structure/i)).toBeInTheDocument();
  }, 10000);
});
