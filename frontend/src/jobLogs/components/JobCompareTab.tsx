import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAnimePressables, useAnimeReveal } from "../../commons/animations";
import { Button, Card, CardContent } from "../../commons/components/ui";
import { displayJobName, localeForLanguage, resolveLanguage, resourceKeyForJob, statusTranslationKey } from "../../home/homeUtils";
import { resolveProteinNameFromOutputs } from "../jobNameResolver";
import type { Job } from "../../types/domain";
import { fetchJobOutputs, fetchJobsList } from "../logsApi";
import { useJobDetailSnapshot } from "../useJobDetailSnapshot";
import type { JobDetailSnapshot } from "../types";
import { ProteinOverviewPanel } from "./ProteinOverviewPanel";

type JobCompareTabProps = {
  baseJobId: string;
  baseSnapshot: JobDetailSnapshot;
};

const statusClassByValue = {
  PENDING: "bg-slate-200 text-slate-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
} as const;

const resolveJobLabel = (job: Job, resolvedNames: Record<string, string>): string => {
  if (resolvedNames[job.job_id]) {
    return resolvedNames[job.job_id];
  }

  return displayJobName(job);
};

export function JobCompareTab({ baseJobId, baseSnapshot }: JobCompareTabProps) {
  const { t, i18n } = useTranslation();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const locale = localeForLanguage(resolveLanguage(i18n.resolvedLanguage ?? i18n.language));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resolvedJobNames, setResolvedJobNames] = useState<Record<string, string>>({});
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const comparableJobs = useMemo(
    () => jobs.filter((job) => job.job_id !== baseJobId),
    [baseJobId, jobs]
  );
  const comparableJobsKey = useMemo(
    () => comparableJobs.map((job) => job.job_id).join("|"),
    [comparableJobs]
  );
  const selectedJob = comparableJobs.find((job) => job.job_id === selectedJobId) ?? null;
  const selectedSnapshot = useJobDetailSnapshot(selectedJobId, selectedJob);

  useAnimeReveal(sectionRef, {
    selector: "[data-anime='compare-reveal']",
    dependencyKey: `${selectedJobId ?? "none"}|${comparableJobsKey}`,
    delayStep: 70,
    duration: 520,
    translateY: 12,
    startScale: 0.996,
  });

  useAnimePressables(sectionRef, {
    selector: "button, a, .anime-pressable, [data-anime='pressable']",
    dependencyKey: `${selectedJobId ?? "none"}|${comparableJobsKey}`,
  });

  useEffect(() => {
    let cancelled = false;

    const hydrateCompletedJobNames = async () => {
      const completedJobs = jobs.filter((job) => job.status === "COMPLETED");
      if (completedJobs.length === 0) {
        return;
      }

      const resolvedEntries = await Promise.all(
        completedJobs.map(async (job) => {
          try {
            const outputs = await fetchJobOutputs(job.job_id);
            const resolvedName = resolveProteinNameFromOutputs(outputs);

            return resolvedName ? [job.job_id, resolvedName] as const : null;
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setResolvedJobNames((current) => ({
          ...current,
          ...Object.fromEntries(
            resolvedEntries.filter((entry): entry is readonly [string, string] => entry !== null)
          ),
        }));
      }
    };

    void hydrateCompletedJobNames();

    return () => {
      cancelled = true;
    };
  }, [jobs]);

  useEffect(() => {
    const resolvedName = resolveProteinNameFromOutputs(selectedSnapshot.outputs);

    if (!selectedJobId || !resolvedName) {
      return;
    }

    setResolvedJobNames((current) => (
      current[selectedJobId] === resolvedName
        ? current
        : {
            ...current,
            [selectedJobId]: resolvedName,
          }
    ));
  }, [selectedJobId, selectedSnapshot.outputs]);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      try {
        setIsLoadingJobs(true);
        const nextJobs = await fetchJobsList(50);
        if (cancelled) {
          return;
        }

        setJobs(
          [...nextJobs].sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
          )
        );
        setJobsError(null);
      } catch (error) {
        if (!cancelled) {
          setJobsError(error instanceof Error ? error.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingJobs(false);
        }
      }
    };

    void loadJobs();
    const interval = window.setInterval(() => {
      void loadJobs();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div ref={sectionRef} className="space-y-4">
      <div data-anime="compare-reveal" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
        <div data-anime="compare-reveal" className="min-w-0">
          <ProteinOverviewPanel
            jobId={baseJobId}
            job={baseSnapshot.job}
            outputs={baseSnapshot.outputs}
            accounting={baseSnapshot.accounting}
            proteinDetail={baseSnapshot.proteinDetail}
            compact
            panelLabel={t("jobLogs.compare.currentProtein")}
          />
        </div>

        <div className="hidden xl:block xl:bg-border/60" />

        <div data-anime="compare-reveal" className="min-w-0">
          {selectedJobId && selectedJob ? (
            <div className="space-y-4">
              {selectedSnapshot.errorMessage ? (
                <div data-anime="compare-reveal" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {t(selectedSnapshot.errorMessage.key, selectedSnapshot.errorMessage.params)}
                </div>
              ) : null}

              {selectedSnapshot.isLoading && !selectedSnapshot.job ? (
                <div data-anime="compare-reveal" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("jobLogs.compare.loadingSelection")}
                </div>
              ) : null}

              <ProteinOverviewPanel
                jobId={selectedJobId}
                job={selectedSnapshot.job}
                outputs={selectedSnapshot.outputs}
                accounting={selectedSnapshot.accounting}
                proteinDetail={selectedSnapshot.proteinDetail}
                compact
                panelLabel={t("jobLogs.compare.comparedProtein")}
                toolbar={
                  <Button type="button" variant="outline" className="gap-2 text-[11px]" onClick={() => setSelectedJobId(null)}>
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {t("jobLogs.compare.changeSelection")}
                  </Button>
                }
              />
            </div>
          ) : (
            <Card data-anime="compare-reveal" className="surface-shadow rounded-2xl border-border/40 bg-white/95">
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                    {t("jobLogs.compare.selectTitle")}
                  </p>
                  <p className="text-sm text-slate-600">{t("jobLogs.compare.selectDescription")}</p>
                </div>

                {jobsError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {jobsError}
                  </div>
                ) : null}

                {isLoadingJobs ? (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("jobLogs.compare.loadingJobs")}
                  </div>
                ) : null}

                {!isLoadingJobs && comparableJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    {t("jobLogs.compare.empty")}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {comparableJobs.map((job) => (
                    <div
                      key={job.job_id}
                      data-anime="compare-reveal"
                      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-slate-50/80 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-950">{resolveJobLabel(job, resolvedJobNames)}</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${statusClassByValue[job.status]}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {t(statusTranslationKey[job.status])}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>{job.job_id}</span>
                          <span>·</span>
                          <span>{new Date(job.created_at).toLocaleString(locale)}</span>
                          <span>·</span>
                          <span>{t(resourceKeyForJob(job))}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="gap-2 text-[11px]"
                        onClick={() => setSelectedJobId(job.job_id)}
                        aria-label={`${t("jobLogs.compare.compareAction")} ${resolveJobLabel(job, resolvedJobNames)}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("jobLogs.compare.compareAction")}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
