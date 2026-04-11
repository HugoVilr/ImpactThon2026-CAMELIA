import { Loader2, Rocket, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardHeader, CardTitle } from "../../commons/components/ui";

type SequencePanelProps = {
  fastaSequence: string;
  isSubmittingJob: boolean;
  isRunDisabled: boolean;
  onOpenUploadModal: () => void;
  onRunFolding: () => void;
  onSequenceChange: (value: string) => void;
};

export function SequencePanel({
  fastaSequence,
  isSubmittingJob,
  isRunDisabled,
  onOpenUploadModal,
  onRunFolding,
  onSequenceChange,
}: SequencePanelProps) {
  const { t } = useTranslation();

  return (
    <Card className="surface-shadow overflow-hidden border-border bg-card">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border bg-muted/55 px-4 py-3">
        <CardTitle className="text-sm font-semibold">{t("sequence.title")}</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-slate-300 bg-white text-[11px] font-bold hover:bg-slate-50"
          onClick={onOpenUploadModal}
        >
          <Upload className="h-4 w-4" />
          {t("sequence.uploadButton")}
        </Button>
      </CardHeader>

      <CardContent className="bg-card p-4">
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="fasta-sequence" className="block">
            <textarea
              id="fasta-sequence"
              aria-label={t("sequence.input")}
              value={fastaSequence}
              onChange={(event) => onSequenceChange(event.target.value)}
              placeholder={t("sequence.inputPlaceholder")}
              rows={12}
              className="block min-h-[320px] w-full resize-y rounded-none border border-border bg-white p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none transition focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              onClick={onRunFolding}
              disabled={isRunDisabled || isSubmittingJob}
              className="h-12 min-w-[260px] gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25"
            >
              {isSubmittingJob ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isSubmittingJob ? t("sequence.submittingButton") : t("sequence.runButton")}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">{t("sequence.uploadOnlyHint")}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
