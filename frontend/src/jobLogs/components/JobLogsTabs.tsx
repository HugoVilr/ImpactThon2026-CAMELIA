import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import type { JobDetailsTab } from "../jobResultsUtils";

type JobLogsTabsProps = {
  jobId: string;
  activeTab: JobDetailsTab;
  onTabChange: (tab: JobDetailsTab) => void;
  showMeta?: boolean;
};

const tabStyles = "pb-3 text-[15px] font-bold transition-colors";

export function JobLogsTabs({ jobId, activeTab, onTabChange, showMeta = true }: JobLogsTabsProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      {showMeta ? (
        <p className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          {t("jobLogs.kicker")}
        </p>
      ) : null}

      <nav className="flex items-center gap-7 border-b border-border/60">
        <button
          type="button"
          onClick={() => onTabChange("viewer")}
          className={cn(
            tabStyles,
            activeTab === "viewer"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("jobLogs.tabs.viewer")}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("compare")}
          className={cn(
            tabStyles,
            activeTab === "compare"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("jobLogs.tabs.compare")}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("logs")}
          className={cn(
            tabStyles,
            activeTab === "logs"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("jobLogs.tabs.logs")}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("extras")}
          className={cn(
            tabStyles,
            activeTab === "extras"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t("jobLogs.tabs.extras")}
        </button>
      </nav>

      {showMeta ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("jobLogs.jobId", { id: jobId })}
        </p>
      ) : null}
    </section>
  );
}
