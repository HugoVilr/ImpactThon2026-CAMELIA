import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HomeFooter, StatusBanners, TopBar } from "../commons/components";
import { resolveLanguage } from "../home/homeUtils";
import { fetchJobOutputs, fetchJobStatus } from "./logsApi";
import { buildSyntheticLogs, isJobActive, parseRawLogs } from "./jobLogsUtils";
import { JobLogDownloadAction, JobLogStreamPanel, JobLogsProgressCard, JobLogsTabs } from "./components";
import type { FeedbackMessage, LanguageCode } from "../types/domain";
import type { JobLogEntry, JobStatusPayload } from "./types";

type JobLogsPageProps = {
  jobId: string;
};

export function JobLogsPage({ jobId }: JobLogsPageProps) {
  const { i18n } = useTranslation();
  const [job, setJob] = useState<JobStatusPayload | null>(null);
  const [logEntries, setLogEntries] = useState<JobLogEntry[]>([]);
  const [rawLogs, setRawLogs] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<FeedbackMessage | null>(null);

  const activeLanguage = resolveLanguage(i18n.resolvedLanguage ?? i18n.language);

  const loadJobData = useCallback(async () => {
    try {
      const currentStatus = await fetchJobStatus(jobId);
      setJob(currentStatus);
      setErrorMessage(null);

      if (currentStatus.status === "COMPLETED") {
        const outputsPayload = await fetchJobOutputs(jobId);
        if (outputsPayload?.logs) {
          setRawLogs(outputsPayload.logs);
          setLogEntries(parseRawLogs(outputsPayload.logs));
        } else {
          setRawLogs(null);
          setLogEntries(buildSyntheticLogs(currentStatus));
        }
      } else {
        setRawLogs(null);
        setLogEntries(buildSyntheticLogs(currentStatus));
      }
    } catch (error) {
      setErrorMessage({
        key: "jobLogs.errors.load",
        params: {
          detail: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJobData();
  }, [loadJobData]);

  useEffect(() => {
    if (!isJobActive(job)) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadJobData();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [job, loadJobData]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setErrorMessage(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [errorMessage]);

  const handleLanguageChange = (language: LanguageCode) => {
    void i18n.changeLanguage(language);
  };

  const effectiveEntries = useMemo(() => {
    if (logEntries.length > 0) {
      return logEntries;
    }

    return buildSyntheticLogs(job);
  }, [job, logEntries]);

  return (
    <>
      <TopBar activeLanguage={activeLanguage} onLanguageChange={handleLanguageChange} />

      <main className="page-enter mx-auto w-full max-w-[1320px] space-y-8 px-4 pb-10 pt-24 md:px-6">
        <JobLogsTabs jobId={jobId} activeTab="logs" onTabChange={() => undefined} />
        <JobLogsProgressCard job={job} loading={isLoading} />
        <JobLogStreamPanel entries={effectiveEntries} isLive={isJobActive(job)} />
        <JobLogDownloadAction jobId={jobId} rawLogs={rawLogs} entries={effectiveEntries} />

        <HomeFooter />
        <StatusBanners errorMessage={errorMessage} successMessage={null} />
      </main>
    </>
  );
}
