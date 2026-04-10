import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import App from "./App";

const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
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
        version: "1.0.0"
      })
    } as Response;
  }

  if (url.includes("/jobs/?limit=20")) {
    return {
      ok: true,
      json: async () => [
        {
          job_id: "job_test_001",
          status: "COMPLETED",
          created_at: "2026-04-10T19:04:12.232598",
          started_at: "2026-04-10T19:04:17.237785",
          completed_at: "2026-04-10T19:04:22.633668",
          gpus: 1,
          cpus: 8,
          memory_gb: 32,
          max_runtime_seconds: 3600,
          fasta_filename: "ubiquitin.fasta",
          error_message: null
        }
      ]
    } as Response;
  }

  if (url.endsWith("/proteins/samples")) {
    return {
      ok: true,
      json: async () => [
        {
          protein_name: "Ubiquitin",
          uniprot_id: "P0CG47",
          sequence_length: 76,
          fasta: ">sp|P0CG47|UBQ_HUMAN\nMQIFVKTLTGKTI"
        }
      ]
    } as Response;
  }

  if (url.endsWith("/jobs/submit") && init?.method === "POST") {
    return {
      ok: true,
      json: async () => ({
        job_id: "job_new_002",
        status: "PENDING",
        message: "Job submitted successfully"
      })
    } as Response;
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ detail: "Not found" })
  } as Response;
});

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("App", () => {
  it("renders dashboard data from CESGA API", async () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /camelia \+ cesga mock api/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(/CESGA Supercomputer Simulator/i)).toBeInTheDocument();
    expect(await screen.findByText(/Job ID: job_test_001/i)).toBeInTheDocument();
  });

  it("uploads FASTA file and submits a job", async () => {
    render(<App />);
    await screen.findByText(/CESGA Supercomputer Simulator/i);

    const uploadedFile = new File([">test\nMKTLLIL"], "uploaded.fasta", {
      type: "text/plain"
    });

    fireEvent.change(screen.getByLabelText(/upload fasta file/i), {
      target: { files: [uploadedFile] }
    });

    expect(await screen.findByText(/Archivo cargado: uploaded\.fasta/i)).toBeInTheDocument();
    expect((screen.getByLabelText(/fasta filename/i) as HTMLInputElement).value).toBe(
      "uploaded.fasta"
    );
    expect((screen.getByLabelText(/fasta sequence/i) as HTMLTextAreaElement).value).toContain(
      ">test"
    );

    fireEvent.click(screen.getByRole("button", { name: /enviar job/i }));

    expect(
      await screen.findByText(/Job enviado: job_new_002 \(PENDING\)/i)
    ).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/jobs/submit"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
