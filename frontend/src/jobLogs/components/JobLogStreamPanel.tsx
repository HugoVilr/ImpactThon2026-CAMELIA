import type { ComponentType } from "react";
import { Activity, AlertTriangle, CircleAlert, Info, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import type { JobLogEntry, JobLogLevel } from "../types";

type JobLogStreamPanelProps = {
  entries: JobLogEntry[];
  isLive: boolean;
};

const rowClassesByLevel: Record<JobLogLevel, string> = {
  info: "hover:bg-slate-100/70 text-slate-700",
  progress: "text-primary hover:bg-emerald-50/70",
  warning: "border border-amber-200/70 bg-amber-50/70 text-amber-800",
  error: "border border-red-200/70 bg-red-50/60 text-red-700",
};

const iconByType: Record<JobLogLevel, ComponentType<{ className?: string }>> = {
  info: Info,
  progress: Activity,
  warning: AlertTriangle,
  error: CircleAlert,
};

const iconClassByType: Record<JobLogLevel, string> = {
  info: "text-slate-500",
  progress: "text-primary",
  warning: "text-amber-600",
  error: "text-red-600",
};

const levelLabelByType: Record<JobLogLevel, string> = {
  info: "INFO",
  progress: "PROGRESS",
  warning: "WARN",
  error: "ERROR",
};

export function JobLogStreamPanel({ entries, isLive }: JobLogStreamPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="surface-shadow overflow-hidden rounded-xl border border-border/50 bg-card/95">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("jobLogs.stream.title")}
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <Radio className={cn("h-3.5 w-3.5", isLive && "animate-pulse text-primary")} />
          <span>{isLive ? t("jobLogs.stream.live") : t("jobLogs.stream.snapshot")}</span>
        </div>
      </div>

      <div className="space-y-1 p-4 font-mono text-xs">
        {entries.length === 0 ? (
          <p className="rounded-lg px-4 py-5 text-center text-muted-foreground">{t("jobLogs.stream.empty")}</p>
        ) : (
          entries.map((entry) => {
            const Icon = iconByType[entry.level];

            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-4 py-2 transition-colors",
                  rowClassesByLevel[entry.level]
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClassByType[entry.level])} />
                <p className="leading-relaxed">
                  <span className="text-[11px] text-slate-500">[{entry.timestamp}] </span>
                  <span className="text-[11px] font-bold">[{levelLabelByType[entry.level]}] </span>
                  <span>{entry.message}</span>
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
