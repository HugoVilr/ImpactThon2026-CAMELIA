import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import i18n from "./i18n";
import { setupStore } from "./store";

type MockState = {
  failJobs: boolean;
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
  jobs: [
    {
      job_id: "job_done_001",
      status: "COMPLETED",
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

const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

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
      json: async () => mockState.jobs,
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
  vi.stubGlobal("fetch", mockFetch);
  await i18n.changeLanguage("es");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("App Home", () => {
  it("renders home layout and jobs table", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: /biohack localfold/i })).toBeInTheDocument();
    expect(await screen.findByText(/trabajos recientes/i)).toBeInTheDocument();
    expect(await screen.findByText(/job_done_001/i)).toBeInTheDocument();
    expect(await screen.findByText(/job_running_002/i)).toBeInTheDocument();
  });

  it("filters jobs by status", async () => {
    renderApp();
    await screen.findByText(/job_done_001/i);

    fireEvent.click(screen.getByRole("button", { name: /en ejecución/i }));
    expect(await screen.findByText(/job_running_002/i)).toBeInTheDocument();
    expect(screen.queryByText(/job_done_001/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /completados/i }));
    expect(await screen.findByText(/job_done_001/i)).toBeInTheDocument();
    expect(screen.queryByText(/job_running_002/i)).not.toBeInTheDocument();
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
