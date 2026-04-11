import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "../commons/components/ui";
import { ProteinViewer, type ProteinViewerHandle } from "../components/ProteinViewer";
import { getPresetById } from "../config/presets";
import { apiUrl } from "../store/actions/workspaceActions";
import type { JobStatus } from "../types/domain";

type ProteinDetail = {
  protein_name: string;
  fasta_ready: string;
};

type JobSubmitResponse = {
  job_id: string;
  status: JobStatus;
};

type JobStatusResponse = {
  status: JobStatus;
  error_message?: string | null;
};

type JobOutputsResponse = {
  structural_data: {
    pdb_file: string | null;
    cif_file: string | null;
  };
};

type XrSupport = {
  ar: boolean;
  vr: boolean;
};

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

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

export function TestXrPage() {
  const viewerRef = useRef<ProteinViewerHandle>(null);
  const [structureData, setStructureData] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Preparing live ubiquitin demo...");
  const [error, setError] = useState<string | null>(null);
  const [xrSupport, setXrSupport] = useState<XrSupport>({ ar: false, vr: false });
  const [xrError, setXrError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkSupport = async () => {
      if (!navigator.xr) {
        return;
      }

      try {
        const [ar, vr] = await Promise.all([
          navigator.xr.isSessionSupported("immersive-ar"),
          navigator.xr.isSessionSupported("immersive-vr"),
        ]);

        if (active) {
          setXrSupport({ ar, vr });
        }
      } catch {
        if (active) {
          setXrSupport({ ar: false, vr: false });
        }
      }
    };

    void checkSupport();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDemoStructure = async () => {
      const standardPreset = getPresetById("standard");

      try {
        setError(null);
        setIsLoading(true);
        setStatusMessage("Loading documented ubiquitin test protein...");

        const proteinRes = await fetch(`${apiUrl}/proteins/ubiquitin`);
        if (!proteinRes.ok) {
          throw new Error(`Protein fetch failed: ${await parseHttpError(proteinRes)}`);
        }

        const protein = (await proteinRes.json()) as ProteinDetail;
        if (!protein.fasta_ready) {
          throw new Error("Protein payload did not include a FASTA sequence.");
        }

        if (cancelled) {
          return;
        }

        setStatusMessage("Submitting live demo folding job...");
        const submitRes = await fetch(`${apiUrl}/jobs/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fasta_sequence: protein.fasta_ready,
            fasta_filename: `${protein.protein_name.replace(/\s+/g, "_").toLowerCase()}.fasta`,
            gpus: standardPreset.gpus,
            cpus: standardPreset.cpus,
            memory_gb: standardPreset.memoryGb,
            max_runtime_seconds: standardPreset.maxRuntimeSeconds,
          }),
        });

        if (!submitRes.ok) {
          throw new Error(`Job submission failed: ${await parseHttpError(submitRes)}`);
        }

        const submitPayload = (await submitRes.json()) as JobSubmitResponse;
        const terminalStatuses: JobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];
        let status = submitPayload.status;
        let lastErrorMessage: string | null | undefined = null;

        while (!terminalStatuses.includes(status)) {
          if (cancelled) {
            return;
          }

          setStatusMessage(`Waiting for demo job ${submitPayload.job_id} to complete...`);
          await delay(3000);

          const statusRes = await fetch(`${apiUrl}/jobs/${submitPayload.job_id}/status`);
          if (!statusRes.ok) {
            throw new Error(`Job status failed: ${await parseHttpError(statusRes)}`);
          }

          const statusPayload = (await statusRes.json()) as JobStatusResponse;
          status = statusPayload.status;
          lastErrorMessage = statusPayload.error_message ?? null;
        }

        if (status !== "COMPLETED") {
          throw new Error(lastErrorMessage || `Demo job ended with status ${status}.`);
        }

        if (cancelled) {
          return;
        }

        setStatusMessage("Fetching generated structure output...");
        const outputsRes = await fetch(`${apiUrl}/jobs/${submitPayload.job_id}/outputs`);
        if (!outputsRes.ok) {
          throw new Error(`Job outputs failed: ${await parseHttpError(outputsRes)}`);
        }

        const outputs = (await outputsRes.json()) as JobOutputsResponse;
        const nextStructureData = outputs.structural_data.cif_file ?? outputs.structural_data.pdb_file;

        if (!nextStructureData) {
          throw new Error("Completed demo job returned no PDB or CIF structure.");
        }

        if (cancelled) {
          return;
        }

        setStructureData(nextStructureData);
        setStatusMessage("Structure loaded. XR is available when the viewer finishes initializing.");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load the XR demo.");
          setStatusMessage("XR demo could not be prepared.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDemoStructure();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnterXr = async (mode: "immersive-ar" | "immersive-vr") => {
    setXrError(null);

    try {
      await viewerRef.current?.requestXrSession(mode);
    } catch (err) {
      setXrError(err instanceof Error ? err.message : "Unable to start XR session.");
    }
  };

  return (
    <main className="page-enter mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-4 py-12 md:px-6">
      <Card className="surface-shadow-strong mx-auto w-full max-w-5xl overflow-hidden">
        <CardHeader className="space-y-3 border-b border-border bg-card/90">
          <CardTitle className="font-display text-3xl">Mol* XR Test</CardTitle>
          <CardDescription>
            Live ubiquitin demo route powered by the CESGA mock API. The same Mol* scene shown below
            is reused when entering AR or VR.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 p-4 md:p-6">
          <div className="rounded-lg border border-border bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
            <p>{statusMessage}</p>
            {error ? <p className="mt-2 text-destructive">{error}</p> : null}
            {xrError ? <p className="mt-2 text-destructive">{xrError}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void handleEnterXr("immersive-ar")}
              disabled={!viewerReady || !xrSupport.ar || !!error}
            >
              Enter AR
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleEnterXr("immersive-vr")}
              disabled={!viewerReady || !xrSupport.vr || !!error}
            >
              Enter VR
            </Button>
          </div>

          <div className="h-[560px] overflow-hidden rounded-xl border border-border bg-white">
            <ProteinViewer
              ref={viewerRef}
              structureData={structureData}
              onReadyChange={setViewerReady}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {!navigator.xr
              ? "WebXR is not available in this browser, so AR and VR entry are disabled."
              : isLoading
                ? "The viewer will become XR-ready after the live mock job finishes and the structure loads."
                : "XR buttons enable only for modes supported by the current browser and device."}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
