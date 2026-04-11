import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Cpu,
  Database,
  Download,
  Dna,
  Info,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { HomeFooter, SafetyFindingsModal, StatusBanners, TopBar, type SafetyFinding } from "../commons/components";
import { Badge, Button, Card, CardContent } from "../commons/components/ui";
import { ProteinViewer, type ProteinViewerHandle } from "../components/ProteinViewer";
import { resolveLanguage } from "../home/homeUtils";
import { fetchJobAccounting, fetchJobOutputs, fetchJobStatus, fetchProteinDetail } from "./logsApi";
import {
  countSafetyAlerts,
  downsamplePaeMatrix,
  formatCompactNumber,
  formatRuntime,
  resolveConfidenceBuckets,
  resolvePaeCellColor,
  resolvePlddtAverage,
  resolveStructureFile,
  type JobDetailsTab,
} from "./jobResultsUtils";
import { buildSyntheticLogs, isJobActive, parseRawLogs } from "./jobLogsUtils";
import { ExportResultsModal, JobLogDownloadAction, JobLogStreamPanel, JobLogsTabs } from "./components";
import type { FeedbackMessage, LanguageCode } from "../types/domain";
import type { JobAccountingPayload, JobLogEntry, JobOutputsPayload, JobStatusPayload } from "./types";

type ProteinCatalogDetail = {
  protein_id?: string;
  category?: string;
  function?: string;
  cellular_location?: string;
  activity?: string;
  tags?: string[];
  known_structures?: Array<{
    pdb_id?: string;
    method?: string;
    resolution?: number | null;
    publication?: string;
  }>;
};

type JobDetailsPageProps = {
  jobId: string;
  initialTab?: JobDetailsTab;
};

type XrSupport = {
  ar: boolean;
  vr: boolean;
};

export function JobDetailsPage({ jobId, initialTab = "viewer" }: JobDetailsPageProps) {
  const { t, i18n } = useTranslation();
  const viewerRef = useRef<ProteinViewerHandle>(null);
  const [activeTab, setActiveTab] = useState<JobDetailsTab>(initialTab);
  const [job, setJob] = useState<JobStatusPayload | null>(null);
  const [outputs, setOutputs] = useState<JobOutputsPayload | null>(null);
  const [accounting, setAccounting] = useState<JobAccountingPayload | null>(null);
  const [proteinDetail, setProteinDetail] = useState<ProteinCatalogDetail | null>(null);
  const [logEntries, setLogEntries] = useState<JobLogEntry[]>([]);
  const [rawLogs, setRawLogs] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<FeedbackMessage | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [xrSupport, setXrSupport] = useState<XrSupport>({ ar: false, vr: false });
  const [xrError, setXrError] = useState<string | null>(null);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const activeLanguage = resolveLanguage(i18n.resolvedLanguage ?? i18n.language);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let active = true;

    const checkSupport = async () => {
      if (!navigator.xr) {
        return;
      }

      try {
        const [ar, vr] = await Promise.all([
          navigator.xr.isSessionSupported("immersive-ar"),
          navigator.xr.isSessionSupported("immersive-vr"),
        ]);

        if (active) {
          setXrSupport({ ar, vr });
        }
      } catch {
        if (active) {
          setXrSupport({ ar: false, vr: false });
        }
      }
    };

    void checkSupport();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadJobData = async () => {
      try {
        const currentStatus = await fetchJobStatus(jobId);
        if (cancelled) {
          return;
        }

        setJob(currentStatus);
        setErrorMessage(null);

        if (currentStatus.status === "COMPLETED") {
          const [outputsPayload, accountingPayload] = await Promise.all([
            fetchJobOutputs(jobId),
            fetchJobAccounting(jobId),
          ]);

          if (cancelled) {
            return;
          }

          setOutputs(outputsPayload);
          setAccounting(accountingPayload);

          if (outputsPayload?.logs) {
            setRawLogs(outputsPayload.logs);
            setLogEntries(parseRawLogs(outputsPayload.logs));
          } else {
            setRawLogs(null);
            setLogEntries(buildSyntheticLogs(currentStatus));
          }

          const identifiedProtein = outputsPayload?.protein_metadata?.identified_protein;
          if (identifiedProtein) {
            const detailPayload = await fetchProteinDetail(identifiedProtein);
            if (!cancelled) {
              setProteinDetail((detailPayload ?? null) as ProteinCatalogDetail | null);
            }
          } else {
            setProteinDetail(null);
          }
        } else {
          setOutputs(null);
          setAccounting(null);
          setProteinDetail(null);
          setRawLogs(null);
          setLogEntries(buildSyntheticLogs(currentStatus));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage({
            key: "jobLogs.errors.load",
            params: {
              detail: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }
    };

    void loadJobData();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (!isJobActive(job)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const currentStatus = await fetchJobStatus(jobId);
        setJob(currentStatus);

        if (currentStatus.status === "COMPLETED") {
          const [outputsPayload, accountingPayload] = await Promise.all([
            fetchJobOutputs(jobId),
            fetchJobAccounting(jobId),
          ]);
          setOutputs(outputsPayload);
          setAccounting(accountingPayload);

          if (outputsPayload?.logs) {
            setRawLogs(outputsPayload.logs);
            setLogEntries(parseRawLogs(outputsPayload.logs));
          } else {
            setRawLogs(null);
            setLogEntries(buildSyntheticLogs(currentStatus));
          }

          const identifiedProtein = outputsPayload?.protein_metadata?.identified_protein;
          if (identifiedProtein) {
            const detailPayload = await fetchProteinDetail(identifiedProtein);
            setProteinDetail((detailPayload ?? null) as ProteinCatalogDetail | null);
          } else {
            setProteinDetail(null);
          }
        } else {
          setLogEntries(buildSyntheticLogs(currentStatus));
        }
      } catch {
        // Keep the last successful snapshot while polling.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [job, jobId]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setErrorMessage(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [errorMessage]);

  const handleLanguageChange = (language: LanguageCode) => {
    void i18n.changeLanguage(language);
  };

  const handleEnterXr = async (mode: "immersive-ar" | "immersive-vr") => {
    setXrError(null);

    try {
      await viewerRef.current?.requestXrSession(mode);
    } catch (error) {
      setXrError(error instanceof Error ? error.message : "Unable to start XR session.");
    }
  };

  const effectiveEntries = logEntries.length > 0 ? logEntries : buildSyntheticLogs(job);
  const structureData = resolveStructureFile(outputs);
  const plddtAverage = resolvePlddtAverage(outputs);
  const confidenceBuckets = resolveConfidenceBuckets(outputs);
  const bucketMax = Math.max(...confidenceBuckets.map((bucket) => bucket.value), 1);
  const paeGrid = downsamplePaeMatrix(outputs?.structural_data.confidence.pae_matrix);
  const paeOriginalSize = outputs?.structural_data.confidence.pae_matrix?.length ?? 1;
  const paeStep = Math.max(1, Math.ceil(paeOriginalSize / 24));
  const biologicalData = outputs?.biological_data;
  const secondaryStructure = biologicalData?.secondary_structure_prediction;
  const sequenceProperties = biologicalData?.sequence_properties;
  const proteinMetadata = outputs?.protein_metadata;
  const safetyAlerts = countSafetyAlerts(outputs);
  const confidenceTotal = confidenceBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const safetyFindings = useMemo<SafetyFinding[]>(() => {
    const toxicityFindings =
      biologicalData?.toxicity_alerts?.map((alert, index) => ({
        id: `toxicity-${index}`,
        category: "toxicity" as const,
        severity: "warning" as const,
        title: alert,
        description: "",
      })) ?? [];

    const allergenicityFindings =
      biologicalData?.allergenicity_alerts?.map((alert, index) => ({
        id: `allergenicity-${index}`,
        category: "allergenicity" as const,
        severity: "warning" as const,
        title: alert,
        description: "",
      })) ?? [];

    return [...toxicityFindings, ...allergenicityFindings];
  }, [biologicalData?.allergenicity_alerts, biologicalData?.toxicity_alerts]);
  const hasSafetyData = Boolean(biologicalData);


  return (
    <>
      <TopBar
        activeLanguage={activeLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <main className="page-enter mx-auto w-full max-w-[1200px] space-y-4 px-4 pb-8 pt-6 md:px-5">
        <section className="space-y-3">
          <div className="space-y-2">
            <p className="font-headline text-[1.85rem] font-extrabold uppercase tracking-[0.22em] text-primary md:text-[2.2rem]">
              {t("jobLogs.kicker")}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-b border-border/60 pb-2 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <JobLogsTabs jobId={jobId} activeTab={activeTab} onTabChange={setActiveTab} showMeta={false} />
            </div>

            {activeTab === "viewer" ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-2 px-3.5 text-[10px] uppercase tracking-[0.14em]"
                  onClick={() => setIsExportModalOpen(true)}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("jobLogs.details.export")}
                </Button>
                <Button type="button" className="h-8 gap-2 px-3.5 text-[10px] uppercase tracking-[0.14em]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("jobLogs.details.aiDiscovery")}
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {activeTab === "viewer" ? (
          <>
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="flex min-w-0 flex-col space-y-4">
                  <Card className="surface-shadow-strong overflow-hidden rounded-2xl border-border/40 bg-white/95">
                    <CardContent className="p-0">
                      <div className="relative h-[480px] overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.96),rgba(246,248,248,0.92)_42%,rgba(235,240,238,0.9)_100%)] xl:h-[550px]">
                        {structureData ? (
                          <div className="absolute inset-0 p-3">
                            <ProteinViewer ref={viewerRef} structureData={structureData} onReadyChange={setViewerReady} />
                          </div>
                        ) : (
                          <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">
                            {t("jobLogs.details.noStructure")}
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,transparent_38%,rgba(20,36,29,0.03)_100%)]" />

                        <div className="absolute top-5 left-5 flex items-center gap-2 z-10">
                          <Button
                            type="button"
                            className="h-8 rounded-xl px-4 text-[10px] font-bold uppercase tracking-[0.1em] shadow-sm"
                            disabled={!viewerReady || !xrSupport.vr || !structureData}
                            onClick={() => void handleEnterXr("immersive-vr")}
                          >
                            {t("jobLogs.details.viewVr")}
                          </Button>
                          <Button
                            type="button"
                            className="h-8 rounded-xl px-4 text-[10px] font-bold uppercase tracking-[0.1em] shadow-sm"
                            disabled={!viewerReady || !xrSupport.ar || !structureData}
                            onClick={() => void handleEnterXr("immersive-ar")}
                          >
                            {t("jobLogs.details.viewAr")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {xrError ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {xrError}
                    </div>
                  ) : null}
                </section>

                <aside className="min-w-0">
                  <Card className="surface-shadow h-full rounded-2xl border-border/40 bg-white/95">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2" title={t("jobLogs.details.too_plddt")}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.plddt")}</p>
                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                          </div>
                          <p className="mt-2 font-headline text-[2.2rem] font-extrabold leading-none tracking-[-0.05em] text-slate-950">
                            {plddtAverage === null ? "N/A" : formatCompactNumber(plddtAverage, 1)}
                            {plddtAverage !== null ? <span className="ml-1 text-[1.05rem] text-primary">%</span> : null}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-slate-800">
                          <span className="font-semibold">{t("jobLogs.details.confDist")}</span>
                          <span className="text-slate-400">n={confidenceTotal || sequenceProperties?.length || 0}</span>
                        </div>

                        <div className="flex h-9 items-end gap-1">
                          {confidenceBuckets.map((bucket) => (
                            <div
                              key={bucket.key}
                              className={`${bucket.toneClass} flex-1 rounded-t-sm`}
                              style={{ height: `${Math.max((bucket.value / bucketMax) * 100, bucket.value > 0 ? 12 : 0)}%` }}
                            />
                          ))}
                        </div>

                        <div className="space-y-2">
                          <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-blue-700" />
                          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">
                            <span>{t("jobLogs.details.veryLow")}</span>
                            <span>{t("jobLogs.details.high")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-border/60 pt-3">
                        <div className="flex items-center gap-2" title={t("jobLogs.details.too_pae")}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.pae")}</p>
                          <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                        </div>

                        <div
                          className="grid aspect-square gap-px overflow-hidden rounded-xl bg-emerald-50/80 ring-1 ring-emerald-100"
                          style={{ gridTemplateColumns: `repeat(${paeGrid[0]?.length ?? 1}, minmax(0, 1fr))` }}
                        >
                          {paeGrid.length > 0 ? (
                            paeGrid.flatMap((row, rowIndex) =>
                              row.map((value, colIndex) => {
                                const startX = rowIndex * paeStep + 1;
                                const endX = Math.min((rowIndex + 1) * paeStep, paeOriginalSize);
                                const startY = colIndex * paeStep + 1;
                                const endY = Math.min((colIndex + 1) * paeStep, paeOriginalSize);

                                return (
                                  <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className="min-h-0 min-w-0 hover:ring-2 hover:ring-white hover:scale-[1.3] origin-center transition-all cursor-crosshair z-10 hover:z-20 relative"
                                    style={{ backgroundColor: resolvePaeCellColor(value) }}
                                    title={`Residuos ${startX}-${endX} vs ${startY}-${endY}: Error esperado de ${formatCompactNumber(value, 2)}Å`}
                                    onMouseEnter={() => viewerRef.current?.highlightResidues(startX, endX)}
                                    onMouseLeave={() => viewerRef.current?.clearHighlight()}
                                    onClick={() => viewerRef.current?.focusResidues(startX, endX)}
                                  />
                                );
                              })
                            )
                          ) : (
                            <div className="col-span-full grid place-items-center text-sm text-muted-foreground">{t("jobLogs.details.paeUnavail")}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </aside>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] min-w-0">
                  <Card className="surface-shadow h-full flex flex-col rounded-2xl border-border/40 bg-white/95">
                    <CardContent className="flex flex-1 flex-col gap-3 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{t("jobLogs.details.bioInsights")}</p>

                      <div className="flex flex-1 flex-col gap-3 text-[13px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2" title={t("jobLogs.details.too_solubility")}>
                            <span>{t("jobLogs.details.solubility")}</span>
                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                          </div>
                          <span className="text-[1.25rem] font-extrabold text-primary">
                            {formatCompactNumber(biologicalData?.solubility_score, 1)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/60 pt-3">
                          <div className="flex items-center gap-2" title={t("jobLogs.details.too_stability")}>
                            <span>{t("jobLogs.details.stability")}</span>
                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-900">
                            {(biologicalData?.stability_status ?? "N/A").toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/60 pt-3">
                          <div className="flex items-center gap-2" title={t("jobLogs.details.too_instability")}>
                            <span>{t("jobLogs.details.instability")}</span>
                            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                          </div>
                          <span className="text-[1.25rem] font-extrabold text-slate-950">
                            {formatCompactNumber(biologicalData?.instability_index, 1)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="mt-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] text-left transition hover:bg-amber-100/60 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => setIsSafetyModalOpen(true)}
                          disabled={!hasSafetyData}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-amber-800">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-bold uppercase tracking-[0.1em] leading-4">
                                {safetyAlerts > 0 ? t("jobLogs.details.alertsFound", { count: safetyAlerts }) : t("jobLogs.details.noAlerts")}
                              </span>
                            </div>
                            <span className="text-amber-500">›</span>
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="surface-shadow h-full flex flex-col rounded-2xl border-border/40 bg-white/95">
                    <CardContent className="flex flex-1 flex-col p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                        {t("jobLogs.details.secStruct")}
                      </p>

                      <div className="flex flex-1 flex-col justify-center gap-6 my-2">
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="bg-primary" style={{ width: `${secondaryStructure?.helix_percent ?? 0}%` }} />
                          <div className="bg-slate-950" style={{ width: `${secondaryStructure?.strand_percent ?? 0}%` }} />
                          <div className="bg-slate-300" style={{ width: `${secondaryStructure?.coil_percent ?? 0}%` }} />
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              {t("jobLogs.details.helix")}
                            </div>
                            <p className="mt-1.5 text-[1.1rem] font-extrabold text-slate-950">
                              {formatCompactNumber(secondaryStructure?.helix_percent, 1)}%
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                              <span className="h-2 w-2 rounded-full bg-slate-950" />
                              {t("jobLogs.details.strand")}
                            </div>
                            <p className="mt-1.5 text-[1.1rem] font-extrabold text-slate-950">
                              {formatCompactNumber(secondaryStructure?.strand_percent, 1)}%
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                              <span className="h-2 w-2 rounded-full bg-slate-300" />
                              {t("jobLogs.details.coil")}
                            </div>
                            <p className="mt-1.5 text-[1.1rem] font-extrabold text-slate-950">
                              {formatCompactNumber(secondaryStructure?.coil_percent, 1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto grid gap-2.5 border-t border-border/60 pt-4 md:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_cys")}>
                            <span>{t("jobLogs.details.cys")}</span>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </div>
                          <p className="mt-2 text-[1.05rem] font-extrabold text-slate-950">
                            {sequenceProperties?.cysteine_residues ?? "N/A"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_arom")}>
                            <span>{t("jobLogs.details.arom")}</span>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </div>
                          <p className="mt-2 text-[1.05rem] font-extrabold text-slate-950">
                            {sequenceProperties?.aromatic_residues ?? "N/A"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_source")}>
                            <span>{t("jobLogs.details.source")}</span>
                            <Info className="h-3.5 w-3.5 cursor-help flex-shrink-0" />
                          </div>
                          <p className="mt-2 break-words text-[10px] font-extrabold uppercase tracking-[0.04em] text-slate-950">
                            {biologicalData?.source ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="min-w-0">
                  <Card className="surface-shadow h-full rounded-2xl border-border/40 bg-white/95">
                    <CardContent className="space-y-3 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.meta")}</p>

                      <div className="space-y-3">
                        <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_uniprot")}>
                            <span>{t("jobLogs.details.uniprot")}</span>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </div>
                          <p className="mt-2 break-words text-[0.88rem] font-extrabold leading-6 tracking-[-0.02em] text-slate-950">
                            {proteinMetadata?.uniprot_id ?? "N/A"}
                            {proteinMetadata?.organism ? ` (${proteinMetadata.organism})` : ""}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_mw")}>
                            <span>{t("jobLogs.details.mw")}</span>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </div>
                          <p className="mt-2 text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950">
                            {formatCompactNumber(sequenceProperties?.molecular_weight_kda, 1)} kDa
                          </p>
                        </div>
                        <div className="grid gap-3 grid-cols-2">
                          <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_charges")}>
                              <span>{t("jobLogs.details.charges")}</span>
                              <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                            </div>
                            <p className="mt-2 text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950">
                              {sequenceProperties
                                ? `${sequenceProperties.positive_charges} / ${sequenceProperties.negative_charges}`
                                : "N/A"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500" title={t("jobLogs.details.too_hydro")}>
                              <span className="truncate">{t("jobLogs.details.hydro")}</span>
                              <Info className="h-3.5 w-3.5 text-slate-400 cursor-help flex-shrink-0" />
                            </div>
                            <p className="mt-2 text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950">
                              {typeof sequenceProperties?.hydrophobicity === "number" ? sequenceProperties.hydrophobicity.toFixed(2) : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <details className="surface-shadow group overflow-hidden rounded-2xl border border-border/40 bg-white/95 my-4">
              <summary className="flex cursor-pointer items-center justify-between p-4 px-5 outline-none transition-colors hover:bg-slate-50 font-bold text-[12px] text-slate-800 uppercase tracking-widest">
                {t("jobLogs.tabs.extras")}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180 text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
              </summary>
              <div className="p-4 pt-0 border-t border-border/40">
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ScanSearch className="h-4 w-4 text-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.proteinCat")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border/60 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_category")}>
                          <span>{t("jobLogs.details.category")}</span>
                          <Info className="h-3 w-3 text-slate-400 cursor-help ml-2" />
                        </div>
                        <p className="mt-1 text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950">{proteinDetail?.category ?? "N/A"}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_function")}>
                          <span>{t("jobLogs.details.function")}</span>
                          <Info className="h-3 w-3 text-slate-400 cursor-help ml-2" />
                        </div>
                        <p className="mt-1 truncate text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950" title={proteinDetail?.function}>{proteinDetail?.function ?? "N/A"}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_cellular")}>
                          <span>{t("jobLogs.details.cellular")}</span>
                          <Info className="h-3 w-3 text-slate-400 cursor-help ml-2" />
                        </div>
                        <p className="mt-1 truncate text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950" title={proteinDetail?.cellular_location}>{proteinDetail?.cellular_location ?? "N/A"}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" title={t("jobLogs.details.too_activity")}>
                          <span>{t("jobLogs.details.activity")}</span>
                          <Info className="h-3 w-3 text-slate-400 cursor-help ml-2" />
                        </div>
                        <p className="mt-1 truncate text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950" title={proteinDetail?.activity}>{proteinDetail?.activity ?? "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Dna className="h-4 w-4 text-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.annotations")}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3 h-[calc(100%-28px)]">
                      <div className="flex flex-wrap gap-2 mb-3 border-b border-border/60 pb-3">
                        {(proteinDetail?.tags ?? []).length > 0 ? (
                          proteinDetail?.tags?.map((tag) => (
                            <Badge key={tag} variant="muted" className="text-[9px] px-2 py-0.5 uppercase tracking-wider">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-[0.85rem] font-medium text-slate-500">{t("jobLogs.details.noTags")}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        {(proteinDetail?.known_structures ?? []).length > 0 ? (
                          proteinDetail?.known_structures?.map((structure, index) => (
                            <div key={`${structure.pdb_id ?? "structure"}-${index}`} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[0.85rem] font-bold text-slate-900">{structure.pdb_id ?? t("jobLogs.details.unknownStruct")}</p>
                                <Badge variant="secondary" className="px-1.5 py-0 text-[8px] uppercase tracking-wider">{structure.method ?? t("jobLogs.details.unknownMethod")}</Badge>
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 truncate" title={structure.publication}>
                                {structure.publication ?? t("jobLogs.details.publicationUnavail")}
                                {typeof structure.resolution === "number" ? ` · ${formatCompactNumber(structure.resolution, 1)} Å` : ""}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[0.85rem] font-medium text-slate-500">{t("jobLogs.details.noStructs")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <div className="grid gap-4 rounded-2xl border border-border/40 bg-white/95 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,34,0.08)]">
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-700">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-slate-500" />
                  <span>CPU: <strong className="font-extrabold text-slate-950">{formatCompactNumber(accounting?.accounting.cpu_hours, 3)} hrs</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-slate-500" />
                  <span>GPU: <strong className="font-extrabold text-slate-950">{job?.gpus ? `${job.gpus} GPU` : t("jobLogs.details.cpuOnly")}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-slate-500" />
                  <span>RAM: <strong className="font-extrabold text-slate-950">{job ? `${formatCompactNumber(job.memory_gb, 1)} GB` : "N/A"}</strong></span>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === "logs" ? (
          <div className="space-y-6">
            <JobLogStreamPanel entries={effectiveEntries} isLive={isJobActive(job)} />
            <JobLogDownloadAction jobId={jobId} rawLogs={rawLogs} entries={effectiveEntries} />
          </div>
        ) : null}



        {activeTab !== "viewer" ? (
          <div className="grid gap-4 rounded-xl border border-border/60 bg-card/95 px-5 py-4 shadow-sm md:grid-cols-4">
            <div className="flex items-center gap-3">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.cpuTime")}</p>
                <p className="text-sm font-bold text-slate-900">{formatCompactNumber(accounting?.accounting.cpu_hours, 3)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.gpuTime")}</p>
                <p className="text-sm font-bold text-slate-900">{formatCompactNumber(accounting?.accounting.gpu_hours, 3)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.ramTime")}</p>
                <p className="text-sm font-bold text-slate-900">{formatCompactNumber(accounting?.accounting.memory_gb_hours, 3)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.wallTime")}</p>
                <p className="text-sm font-bold text-slate-900">{formatRuntime(accounting?.accounting.total_wall_time_seconds)}</p>
              </div>
            </div>
          </div>
        ) : null}

        <HomeFooter />
        <StatusBanners errorMessage={errorMessage} successMessage={null} />
      </main>

      <SafetyFindingsModal
        isOpen={isSafetyModalOpen}
        findings={safetyFindings}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      <ExportResultsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        outputs={outputs}
      />
    </>
  );
}
