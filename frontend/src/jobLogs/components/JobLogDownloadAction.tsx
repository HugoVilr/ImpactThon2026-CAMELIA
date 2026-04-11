import { ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../commons/components/ui";
import { composeDownloadableLogs } from "../jobLogsUtils";
import type { JobLogEntry } from "../types";

type JobLogDownloadActionProps = {
  jobId: string;
  rawLogs: string | null;
  entries: JobLogEntry[];
};

export function JobLogDownloadAction({ jobId, rawLogs, entries }: JobLogDownloadActionProps) {
  const { t } = useTranslation();
  const canDownload = Boolean(rawLogs) || entries.length > 0;

  const handleDownload = () => {
    const content = rawLogs ?? composeDownloadableLogs(entries);
    if (!content.trim()) {
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${jobId}-technical.log`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex justify-center pt-2">
      <Button
        type="button"
        className="h-11 gap-2 rounded-lg px-7 text-sm font-bold tracking-wide"
        onClick={handleDownload}
        disabled={!canDownload}
      >
        <ReceiptText className="h-4 w-4" />
        {t("jobLogs.download")}
      </Button>
    </div>
  );
}
