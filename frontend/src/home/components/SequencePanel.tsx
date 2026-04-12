import { useRef } from "react";
import { Loader2, Rocket, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAnimeHoverSheen, useAnimeMagnetic } from "../../commons/animations";
import { Button, Card, CardContent, CardHeader } from "../../commons/components/ui";
import { FastaEditor } from "./FastaEditor";

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
  const panelRef = useRef<HTMLDivElement | null>(null);

  useAnimeMagnetic(panelRef, {
    selector: "[data-anime='sequence-panel']",
    maxTilt: 1.6,
    maxLift: 2.5,
  });

  useAnimeHoverSheen(panelRef, {
    selector: "[data-anime='sheen-target']",
    duration: 580,
  });

  return (
    <Card ref={panelRef} data-anime="sequence-panel" className="surface-shadow overflow-hidden border-border bg-card">
      <CardHeader className="flex-row items-center justify-end space-y-0 border-b border-border bg-muted/55 px-4 py-3">
        <Button
          data-anime="sheen-target"
          type="button"
          variant="outline"
          size="sm"
          className="relative h-9 gap-2 overflow-hidden border-slate-300 bg-white text-[11px] font-bold hover:bg-slate-50"
          onClick={onOpenUploadModal}
        >
          <span data-anime="sheen" className="pointer-events-none absolute inset-y-0 left-[-36%] w-1/3 -skew-x-12 bg-white/65 opacity-0" />
          <Upload className="relative z-[1] h-4 w-4" />
          <span className="relative z-[1]">{t("sequence.uploadButton")}</span>
        </Button>
      </CardHeader>

      <CardContent className="bg-card p-4">
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="fasta-sequence" className="block">
            <FastaEditor
              id="fasta-sequence"
              aria-label={t("sequence.input")}
              value={fastaSequence}
              onChange={onSequenceChange}
              placeholder={t("sequence.inputPlaceholder")}
            />
          </label>

          <div className="flex flex-col items-center gap-2">
            <Button
              data-anime="sheen-target"
              type="button"
              onClick={onRunFolding}
              disabled={isRunDisabled || isSubmittingJob}
              className="relative h-12 min-w-[260px] gap-2 overflow-hidden rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25"
            >
              {!isSubmittingJob ? (
                <span data-anime="sheen" className="pointer-events-none absolute inset-y-0 left-[-36%] w-1/3 -skew-x-12 bg-white/45 opacity-0" />
              ) : null}
              {isSubmittingJob ? (
                <Loader2 className="relative z-[1] h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="relative z-[1] h-4 w-4" />
              )}
              <span className="relative z-[1]">
                {isSubmittingJob ? t("sequence.submittingButton") : t("sequence.runButton")}
              </span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
