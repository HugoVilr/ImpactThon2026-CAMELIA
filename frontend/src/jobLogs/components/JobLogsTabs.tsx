import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

type JobLogsTabsProps = {
  jobId: string;
};

const tabStyles = "pb-3 text-sm font-bold transition-colors";

export function JobLogsTabs({ jobId }: JobLogsTabsProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <p className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
        {t("jobLogs.kicker")}
      </p>

      <nav className="flex items-center gap-8 border-b border-border/60">
        <a href="/" className={cn(tabStyles, "text-muted-foreground hover:text-foreground")}>
          {t("jobLogs.tabs.viewer")}
        </a>
        <span className={cn(tabStyles, "border-b-2 border-primary text-primary")}>
          {t("jobLogs.tabs.logs")}
        </span>
        <a href="/" className={cn(tabStyles, "text-muted-foreground hover:text-foreground")}>
          {t("jobLogs.tabs.extras")}
        </a>
      </nav>

      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("jobLogs.jobId", { id: jobId })}
      </p>
    </section>
  );
}
