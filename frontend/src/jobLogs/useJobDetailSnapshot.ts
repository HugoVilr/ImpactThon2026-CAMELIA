import { useEffect, useState } from "react";
import type { FeedbackMessage } from "../types/domain";
import { buildSyntheticLogs, isJobActive, parseRawLogs } from "./jobLogsUtils";
import { fetchJobAccounting, fetchJobOutputs, fetchJobStatus, fetchProteinDetail } from "./logsApi";
import type { JobDetailSnapshot, ProteinCatalogDetail } from "./types";

const emptySnapshot: JobDetailSnapshot = {
  job: null,
  outputs: null,
  accounting: null,
  proteinDetail: null,
  logEntries: [],
  rawLogs: null,
};

export const fetchJobDetailSnapshot = async (jobId: string): Promise<JobDetailSnapshot> => {
  const currentStatus = await fetchJobStatus(jobId);

  if (currentStatus.status !== "COMPLETED") {
    return {
      job: currentStatus,
      outputs: null,
      accounting: null,
      proteinDetail: null,
      rawLogs: null,
      logEntries: buildSyntheticLogs(currentStatus),
    };
  }

  const [outputsPayload, accountingPayload] = await Promise.all([
    fetchJobOutputs(jobId),
    fetchJobAccounting(jobId),
  ]);

  let proteinDetail: ProteinCatalogDetail | null = null;
  const identifiedProtein = outputsPayload?.protein_metadata?.identified_protein;
  if (identifiedProtein) {
    const detailPayload = await fetchProteinDetail(identifiedProtein);
    proteinDetail = (detailPayload ?? null) as ProteinCatalogDetail | null;
  }

  return {
    job: currentStatus,
    outputs: outputsPayload,
    accounting: accountingPayload,
    proteinDetail,
    rawLogs: outputsPayload?.logs ?? null,
    logEntries: outputsPayload?.logs ? parseRawLogs(outputsPayload.logs) : buildSyntheticLogs(currentStatus),
  };
};

export function useJobDetailSnapshot(jobId?: string | null) {
  const [snapshot, setSnapshot] = useState<JobDetailSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(Boolean(jobId));
  const [errorMessage, setErrorMessage] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    if (!jobId) {
      setSnapshot(emptySnapshot);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;

    const loadSnapshot = async () => {
      setIsLoading(true);

      try {
        const nextSnapshot = await fetchJobDetailSnapshot(jobId);
        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage({
            key: "jobLogs.errors.load",
            params: {
              detail: error instanceof Error ? error.message : "Unknown error",
            },
          });
          setSnapshot(emptySnapshot);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !isJobActive(snapshot.job)) {
      return;
    }

    let cancelled = false;

    const interval = window.setInterval(async () => {
      try {
        const nextSnapshot = await fetchJobDetailSnapshot(jobId);
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch {
        // Keep the last successful snapshot while polling.
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [jobId, snapshot.job]);

  return {
    ...snapshot,
    isLoading,
    errorMessage,
  };
}
