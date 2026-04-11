import { useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle2, OctagonAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui";
import { cn } from "../../lib/utils";

export type SafetyFindingCategory = "toxicity" | "allergenicity";
export type SafetyFindingSeverity = "warning" | "critical";

export type SafetyFinding = {
  id: string;
  title: string;
  description: string;
  category: SafetyFindingCategory;
  severity: SafetyFindingSeverity;
};

type SafetyFindingsModalProps = {
  isOpen: boolean;
  findings: SafetyFinding[];
  onClose: () => void;
};

const severityIconByLevel = {
  warning: AlertTriangle,
  critical: OctagonAlert,
} satisfies Record<SafetyFindingSeverity, typeof AlertTriangle>;

const severityBoxClassByLevel: Record<SafetyFindingSeverity, string> = {
  warning: "bg-amber-100/80 text-amber-700",
  critical: "bg-rose-100/80 text-rose-700",
};

const sectionOrder: SafetyFindingCategory[] = ["toxicity", "allergenicity"];

export function SafetyFindingsModal({ isOpen, findings, onClose }: SafetyFindingsModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const findingsByCategory = useMemo(() => {
    const grouped: Record<SafetyFindingCategory, SafetyFinding[]> = {
      toxicity: [],
      allergenicity: [],
    };

    findings.forEach((finding) => {
      grouped[finding.category].push(finding);
    });

    return grouped;
  }, [findings]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/25 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("safetyModal.ariaLabel")}
      onClick={onClose}
    >
      <section
        className="modal-enter surface-shadow-strong w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-slate-50/70 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{t("safetyModal.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-slate-700"
            aria-label={t("safetyModal.close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {sectionOrder.map((section) => {
            const sectionFindings = findingsByCategory[section];

            return (
              <div key={section} className="space-y-3">
                <h3 className="border-b border-border/70 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  {t(`safetyModal.sections.${section}`)}
                </h3>

                {sectionFindings.length > 0 ? (
                  <div className="space-y-2">
                    {sectionFindings.map((finding) => {
                      const SeverityIcon = severityIconByLevel[finding.severity];

                      return (
                        <article
                          key={finding.id}
                          className={cn(
                            "rounded-lg border border-border/70 px-3.5 py-3",
                            finding.severity === "critical" ? "bg-rose-50/30" : "bg-slate-50/70"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                                severityBoxClassByLevel[finding.severity]
                              )}
                            >
                              <SeverityIcon className="h-4 w-4" />
                            </span>
                            <div className="space-y-1">
                              <h4 className="text-base font-semibold text-slate-900">{finding.title}</h4>
                              <p className="text-sm leading-relaxed text-slate-600">{finding.description}</p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-slate-50/70 px-4 py-8 text-center">
                    <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <p className="text-base font-semibold text-slate-800">{t("safetyModal.noIssuesTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("safetyModal.noIssuesDescription")}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
