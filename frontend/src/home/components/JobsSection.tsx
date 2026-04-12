import { animate } from "animejs";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { shouldSkipAnimation, useAnimePressables, useAnimeReveal } from "../../commons/animations";
import {
  Button,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../commons/components/ui";
import { fetchJobOutputs } from "../../jobLogs/logsApi";
import { resolveProteinNameFromOutputs } from "../../jobLogs/jobNameResolver";
import { cn } from "../../lib/utils";
import { displayJobName, resourceKeyForJob, statusTranslationKey } from "../homeUtils";
import type { Job, JobFilter } from "../../types/domain";
import { JobProgressBar } from "./JobProgressBar";

type JobsSectionProps = {
  locale: string;
  loading: boolean;
  filteredJobs: Job[];
  jobFilter: JobFilter;
  onFilterChange: (filter: JobFilter) => void;
};

const statusClassByValue = {
  PENDING: "bg-slate-200 text-slate-600",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
} as const;

const filterOrder: JobFilter[] = ["all", "running", "completed"];
const JOBS_PER_PAGE = 10;

const filterRefMap = () => ({
  all: null as HTMLButtonElement | null,
  running: null as HTMLButtonElement | null,
  completed: null as HTMLButtonElement | null,
});

const resolveJobLabel = (job: Job, resolvedNames: Record<string, string>): string => {
  if (resolvedNames[job.job_id]) {
    return resolvedNames[job.job_id];
  }

  return displayJobName(job);
};

export function JobsSection({
  locale,
  loading,
  filteredJobs,
  jobFilter,
  onFilterChange,
}: JobsSectionProps) {
  const { t, i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement | null>(null);
  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const filterRefs = useRef(filterRefMap());
  const [filterIndicator, setFilterIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });
  const [resolvedJobNames, setResolvedJobNames] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const pagedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  const rowsAnimationKey = useMemo(() => pagedJobs.map((job) => job.job_id).join("|"), [pagedJobs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [jobFilter]);

  useAnimeReveal(tableBodyRef, {
    selector: ":scope > [data-anime='job-row']",
    dependencyKey: rowsAnimationKey,
    delayStep: 60,
    duration: 420,
    translateY: 10,
    startScale: 0.998,
  });

  useAnimePressables(sectionRef, {
    selector: "button, a, .anime-pressable, [data-anime='pressable']",
    dependencyKey: rowsAnimationKey,
  });

  const updateFilterIndicator = useCallback(() => {
    const filters = filtersRef.current;
    const activeFilter = filterRefs.current[jobFilter];
    if (!filters || !activeFilter) {
      return;
    }

    setFilterIndicator({
      left: activeFilter.offsetLeft,
      width: activeFilter.offsetWidth,
      ready: true,
    });
  }, [jobFilter]);

  useLayoutEffect(() => {
    updateFilterIndicator();
    const rafId = window.requestAnimationFrame(updateFilterIndicator);
    window.addEventListener("resize", updateFilterIndicator);
    const canUseResizeObserver = typeof ResizeObserver !== "undefined";
    const resizeObserver = canUseResizeObserver
      ? new ResizeObserver(() => {
          updateFilterIndicator();
        })
      : null;

    if (resizeObserver && filtersRef.current) {
      resizeObserver.observe(filtersRef.current);
    }
    if (resizeObserver) {
      filterOrder.forEach((filter) => {
        const button = filterRefs.current[filter];
        if (button) {
          resizeObserver.observe(button);
        }
      });
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateFilterIndicator);
      resizeObserver?.disconnect();
    };
  }, [updateFilterIndicator, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!tableShellRef.current || shouldSkipAnimation()) {
      return;
    }

    const transition = animate(tableShellRef.current, {
      opacity: [0.8, 1],
      translateY: [8, 0],
      duration: 300,
      ease: "outCubic",
    });

    return () => {
      transition.revert();
    };
  }, [rowsAnimationKey]);

  useEffect(() => {
    let cancelled = false;

    const hydrateCompletedJobNames = async () => {
      const unresolvedCompletedJobs = filteredJobs.filter(
        (job) => job.status === "COMPLETED" && !resolvedJobNames[job.job_id]
      );

      if (unresolvedCompletedJobs.length === 0) {
        return;
      }

      const resolvedEntries = await Promise.all(
        unresolvedCompletedJobs.map(async (job) => {
          try {
            const outputs = await fetchJobOutputs(job.job_id);
            const resolvedName = resolveProteinNameFromOutputs(outputs);
            return resolvedName ? ([job.job_id, resolvedName] as const) : null;
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
  }, [filteredJobs, resolvedJobNames]);

  return (
    <section ref={sectionRef} className="space-y-3">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h2 className="font-headline text-2xl font-bold text-slate-900 md:text-3xl">
          {t("jobs.title")}
        </h2>

        <div
          ref={filtersRef}
          className="relative inline-flex items-center rounded-md border border-border bg-muted p-1"
          role="tablist"
          aria-label={t("jobs.filtersAria")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-1 left-0 rounded bg-white shadow transition-[transform,width] duration-300 ease-out",
              filterIndicator.ready ? "opacity-100" : "opacity-0"
            )}
            style={{
              width: `${filterIndicator.width}px`,
              transform: `translateX(${filterIndicator.left}px)`,
            }}
          />

          {filterOrder.map((filter) => (
            <button
              key={filter}
              ref={(element) => {
                filterRefs.current[filter] = element;
              }}
              data-anime="jobs-filter"
              className={cn(
                "relative z-[1] rounded px-3 py-1.5 text-[11px] font-bold transition-colors",
                jobFilter === filter ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
              onClick={() => onFilterChange(filter)}
              type="button"
            >
              {filter === "all" ? t("jobs.filterAll") : filter === "running" ? t("jobs.filterRunning") : t("jobs.filterCompleted")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("jobs.loading")}
        </p>
      ) : null}

      <div ref={tableShellRef} className="surface-shadow overflow-hidden rounded-lg border border-border bg-card">
        <Table
          className="table-fixed"
          style={{ "--jobs-actions-width": "20rem", "--jobs-action-button-width": "8.75rem" } as CSSProperties}
        >
          <colgroup>
            <col style={{ width: "calc((100% - var(--jobs-actions-width)) / 4)" }} />
            <col style={{ width: "calc((100% - var(--jobs-actions-width)) / 4)" }} />
            <col style={{ width: "calc((100% - var(--jobs-actions-width)) / 4)" }} />
            <col style={{ width: "calc((100% - var(--jobs-actions-width)) / 4)" }} />
            <col style={{ width: "var(--jobs-actions-width)" }} />
          </colgroup>
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead className="pl-10">{t("jobs.columns.jobName")}</TableHead>
              <TableHead>{t("jobs.columns.status")}</TableHead>
              <TableHead>{t("jobs.columns.timestamp")}</TableHead>
              <TableHead>{t("jobs.columns.resource")}</TableHead>
              <TableHead className="pr-10 text-right">
                <span className="inline-block w-[var(--jobs-action-button-width)] text-left">{t("jobs.columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody ref={tableBodyRef}>
            {pagedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  {t("jobs.empty")}
                </TableCell>
              </TableRow>
            ) : (
              pagedJobs.map((job) => (
                <TableRow key={job.job_id} data-anime="job-row">
                  <TableCell className="pl-10">
                    <Link
                      to={
                        job.status === "COMPLETED"
                          ? `/jobs/${encodeURIComponent(job.job_id)}`
                          : `/jobs/${encodeURIComponent(job.job_id)}/logs`
                      }
                      className="text-xs font-semibold text-slate-800 transition hover:text-primary"
                    >
                      {resolveJobLabel(job, resolvedJobNames)}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold",
                        statusClassByValue[job.status]
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {t(statusTranslationKey[job.status])}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleString(locale)}
                  </TableCell>

                  <TableCell>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-wide text-slate-600">
                      {t(resourceKeyForJob(job))}
                    </span>
                  </TableCell>

                  <TableCell className="pr-10 text-right">
                    {job.status === "RUNNING" || job.status === "PENDING" ? (
                      <div className="ml-auto flex w-full items-center">
                        <div className="flex flex-1 justify-center">
                          <div className="w-24 shrink-0 -translate-x-12">
                            <JobProgressBar job={job} />
                          </div>
                        </div>
                        <Button
                          asChild
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-[var(--jobs-action-button-width)] shrink-0 text-[11px]"
                        >
                          <Link to={`/jobs/${encodeURIComponent(job.job_id)}/logs`}>
                            {t("jobs.actions.viewLogs")}
                          </Link>
                        </Button>
                      </div>
                    ) : job.status === "COMPLETED" ? (
                      <Button
                        asChild
                        type="button"
                        size="sm"
                        className="h-8 w-[var(--jobs-action-button-width)] rounded-md px-4 text-[11px] font-bold"
                      >
                        <Link to={`/jobs/${encodeURIComponent(job.job_id)}`}>{t("jobs.actions.viewResults")}</Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-[var(--jobs-action-button-width)] text-[11px]"
                      >
                        <Link to={`/jobs/${encodeURIComponent(job.job_id)}/logs`}>{t("jobs.actions.details")}</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        labels={{
          previous: t("jobs.pagination.previous"),
          next: t("jobs.pagination.next"),
        }}
        className="mt-2"
      >
        {t("jobs.pagination.pageOf", { current: currentPage, total: totalPages })}
      </Pagination>
    </section>
  );
}
