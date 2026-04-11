import { type ChangeEvent, type DragEvent, type RefObject } from "react";
import { Search, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../commons/components/ui";
import { cn } from "../../lib/utils";

type UploadModalProps = {
  isOpen: boolean;
  isDraggingFile: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onSetDragging: (isDragging: boolean) => void;
  onSelectFile: (file: File) => void;
};

export function UploadModal({
  isOpen,
  isDraggingFile,
  fileInputRef,
  onClose,
  onSetDragging,
  onSelectFile,
}: UploadModalProps) {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onSelectFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onSetDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    onSelectFile(file);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-800/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("modal.ariaLabel")}>
      <div className="modal-enter surface-shadow-strong w-full max-w-xl rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t("modal.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("modal.description")}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            ×
          </Button>
        </div>

        <div
          className={cn(
            "grid justify-items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center",
            isDraggingFile && "border-primary/70 bg-emerald-50"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            onSetDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            onSetDragging(false);
          }}
          onDrop={handleDrop}
        >
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-100 text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-slate-700">{t("modal.dragDrop")}</p>
          <span className="text-xs text-muted-foreground">{t("modal.orSelect")}</span>
          <Button type="button" size="sm" className="mt-1 gap-2" onClick={() => fileInputRef.current?.click()}>
            <Search className="h-4 w-4" />
            {t("modal.browse")}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".fasta,.fa,.faa,.txt"
            aria-label={t("modal.fileInputLabel")}
            onChange={handleFileChange}
          />
        </div>

        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("modal.supported")}</p>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("modal.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
