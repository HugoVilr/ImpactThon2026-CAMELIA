import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../commons/components/ui";
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

export function JobsSection({
  locale,
  loading,
  filteredJobs,
  jobFilter,
  onFilterChange,
}: JobsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h2 className="font-headline text-2xl font-bold text-slate-900 md:text-3xl">{t("jobs.title")}</h2>

        <div className="inline-flex items-center rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t("jobs.filtersAria")}>
          <button
            className={cn(
              "rounded px-3 py-1.5 text-[11px] font-bold transition",
              jobFilter === "all" ? "bg-white text-slate-900 shadow" : "text-slate-500"
            )}
            onClick={() => onFilterChange("all")}
            type="button"
          >
            {t("jobs.filterAll")}
          </button>
          <button
            className={cn(
              "rounded px-3 py-1.5 text-[11px] font-bold transition",
              jobFilter === "running" ? "bg-white text-slate-900 shadow" : "text-slate-500"
            )}
            onClick={() => onFilterChange("running")}
            type="button"
          >
            {t("jobs.filterRunning")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("jobs.loading")}
        </p>
      ) : null}

      <div className="surface-shadow overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/45">
            <TableRow>
              <TableHead>{t("jobs.columns.jobName")}</TableHead>
              <TableHead>{t("jobs.columns.status")}</TableHead>
              <TableHead>{t("jobs.columns.timestamp")}</TableHead>
              <TableHead>{t("jobs.columns.resource")}</TableHead>
              <TableHead className="text-right">{t("jobs.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  {t("jobs.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.job_id}>
                  <TableCell>
                    <strong className="text-xs font-semibold text-slate-800">{displayJobName(job)}</strong>
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

                  <TableCell className="text-right">
                    {job.status === "RUNNING" || job.status === "PENDING" ? (
                      <div className="ml-auto flex w-[220px] items-center justify-end gap-3">
                        <div className="w-24">
                          <JobProgressBar job={job} />
                        </div>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" disabled>
                          {t("jobs.actions.inProgress")}
                        </Button>
                      </div>
                    ) : job.status === "COMPLETED" ? (
                      <Button type="button" size="sm" className="h-8 rounded-md px-4 text-[11px] font-bold">
                        {t("jobs.actions.viewResults")}
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]">
                        {t("jobs.actions.details")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
