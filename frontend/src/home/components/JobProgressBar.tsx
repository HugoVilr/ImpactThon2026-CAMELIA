import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { displayJobName } from "../homeUtils";
import type { Job } from "../../types/domain";

type JobProgressBarProps = {
  job: Job;
};

type ProgressMeta = {
  percent: number;
  indeterminate: boolean;
  toneClass: string;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const asTimestamp = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveProgress = (job: Job, now: number): ProgressMeta => {
  if (job.status === "PENDING") {
    return {
      percent: 20,
      indeterminate: true,
      toneClass: "bg-slate-500",
    };
  }

  if (job.status === "RUNNING") {
    const runtimeSeconds = job.max_runtime_seconds;
    const referenceTime = asTimestamp(job.started_at) ?? asTimestamp(job.created_at);

    if (!referenceTime || runtimeSeconds <= 0) {
      return {
        percent: 55,
        indeterminate: false,
        toneClass: "bg-blue-500",
      };
    }

    const elapsedSeconds = Math.max(0, (now - referenceTime) / 1000);
    const estimatedPercent = clamp(Math.round((elapsedSeconds / runtimeSeconds) * 100), 18, 95);

    return {
      percent: estimatedPercent,
      indeterminate: false,
      toneClass: "bg-blue-500",
    };
  }

  if (job.status === "FAILED" || job.status === "CANCELLED") {
    return {
      percent: 100,
      indeterminate: false,
      toneClass: "bg-red-500",
    };
  }

  return {
    percent: 100,
    indeterminate: false,
    toneClass: "bg-emerald-500",
  };
};

export function JobProgressBar({ job }: JobProgressBarProps) {
  const [now, setNow] = useState(() => Date.now());
  const { t } = useTranslation();

  useEffect(() => {
    if (job.status !== "RUNNING") {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [job.status]);

  const progress = useMemo(() => resolveProgress(job, now), [job, now]);
  const progressAria = t("jobs.progressAria", { name: displayJobName(job) });

  return (
    <div className="w-full">
      <div
        className="relative h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={progressAria}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.indeterminate ? undefined : progress.percent}
      >
        {progress.indeterminate ? (
          <div
            className={cn(
              "job-progress-indeterminate absolute left-0 top-0 h-full w-[42%] rounded-full",
              progress.toneClass
            )}
          />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              progress.toneClass
            )}
            style={{ width: `${progress.percent}%` }}
          />
        )}
      </div>
    </div>
  );
}
