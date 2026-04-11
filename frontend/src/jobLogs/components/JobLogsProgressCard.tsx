import { animate } from "animejs";
import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { shouldSkipAnimation } from "../../commons/animations";
import { cn } from "../../lib/utils";
import { resolveProgressViewModel } from "../jobLogsUtils";
import type { JobStatusPayload } from "../types";

type JobLogsProgressCardProps = {
  job: JobStatusPayload | null;
  loading: boolean;
};

const statusTone = (status: JobStatusPayload["status"] | undefined): string => {
  if (status === "FAILED" || status === "CANCELLED") {
    return "text-red-600";
  }

  if (status === "COMPLETED") {
    return "text-emerald-600";
  }

  return "text-primary";
};

export function JobLogsProgressCard({ job, loading }: JobLogsProgressCardProps) {
  const { t } = useTranslation();
  const progressRef = useRef<HTMLDivElement | null>(null);
  const progress = resolveProgressViewModel(job);
  const phaseLabel = t(`jobLogs.progress.phases.${progress.phase}`);

  const stepLabel = t("jobLogs.progress.step", {
    current: progress.currentStep,
    total: progress.totalSteps,
    phase: phaseLabel,
  });

  const title = loading && !job ? t("jobLogs.progress.loadingTitle") : t(progress.titleKey);
  const currentStatus = job?.status;

  useEffect(() => {
    if (shouldSkipAnimation() || progress.indeterminate || !progressRef.current) {
      return;
    }

    const tween = animate(progressRef.current, {
      width: `${progress.percent}%`,
      duration: 620,
      ease: "outQuart",
    });

    return () => {
      tween.revert();
    };
  }, [progress.indeterminate, progress.percent]);

  return (
    <section className="surface-shadow rounded-xl border border-border/50 bg-card/95 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {currentStatus === "COMPLETED" ? (
            <CheckCircle2 className={cn("h-4 w-4", statusTone(currentStatus))} />
          ) : currentStatus === "FAILED" || currentStatus === "CANCELLED" ? (
            <AlertCircle className={cn("h-4 w-4", statusTone(currentStatus))} />
          ) : (
            <Loader2 className={cn("h-4 w-4 animate-spin", statusTone(currentStatus))} />
          )}
          <p className="text-base font-semibold text-foreground">{title}</p>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-primary">{stepLabel}</p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        {progress.indeterminate ? (
          <div className={cn("job-progress-indeterminate h-full w-[42%] rounded-full", progress.toneClass)} />
        ) : (
          <div
            ref={progressRef}
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", progress.toneClass)}
            style={{ width: `${progress.percent}%` }}
          />
        )}
      </div>
    </section>
  );
}
