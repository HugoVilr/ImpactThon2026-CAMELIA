import { useEffect } from "react";
import { Download, FileJson, FileDown, Layers, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../commons/components/ui";
import type { JobOutputsPayload } from "../types";

type ExportResultsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  outputs?: JobOutputsPayload | null;
};

export function ExportResultsModal({ isOpen, onClose, outputs }: ExportResultsModalProps) {
  const { t } = useTranslation();

  const downloadRealFile = (filename: string, content: string | undefined | null) => {
    if (!content) {
      alert("No data available for this export!");
      return;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const exportActions = [
    {
      id: "pdb",
      icon: Layers,
      title: t("exportModal.pdb.title"),
      desc: t("exportModal.pdb.desc"),
      getContent: () => outputs?.structural_data.pdb_file,
    },
    {
      id: "cif",
      icon: FileDown,
      title: t("exportModal.cif.title"),
      desc: t("exportModal.cif.desc"),
      getContent: () => outputs?.structural_data.cif_file,
    },
    {
      id: "json",
      icon: FileJson,
      title: t("exportModal.json.title"),
      desc: t("exportModal.json.desc"),
      getContent: () => outputs ? JSON.stringify(outputs.structural_data.confidence, null, 2) : null,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("exportModal.title")}
      onClick={onClose}
    >
      <section
        className="modal-enter surface-shadow-strong w-full max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-slate-50/70 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{t("exportModal.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-slate-700"
            aria-label={t("exportModal.close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-4 px-6 py-5">
            {exportActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <article
                  key={action.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-primary">
                      <ActionIcon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1 pr-4">
                      <h4 className="text-[13px] font-bold text-slate-900">{action.title}</h4>
                      <p className="text-[11px] leading-relaxed text-slate-600">{action.desc}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full bg-white shadow-sm ring-1 ring-border text-slate-500 hover:text-primary transition"
                    onClick={() => {
                      const content = action.getContent();
                      const ext = action.id === "json" ? "json" : (action.id === "cif" ? "cif" : "pdb");
                      downloadRealFile(`result-${outputs?.job_id ?? "unknown"}.${ext}`, content);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}
