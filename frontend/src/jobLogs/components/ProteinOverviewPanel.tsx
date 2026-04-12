import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Camera,
  Cpu,
  Database,
  Dna,
  Expand,
  Info,
  RotateCcw,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SafetyFindingsModal, type SafetyFinding } from "../../commons/components";
import { useAnimePressables, useAnimeReveal } from "../../commons/animations";
import { Badge, Button, Card, CardContent } from "../../commons/components/ui";
import { ProteinViewer, type ProteinViewerHandle } from "../../components/ProteinViewer";
import { displayJobName, statusTranslationKey } from "../../home/homeUtils";
import { cn } from "../../lib/utils";
import {
  countSafetyAlerts,
  downsamplePaeMatrix,
  formatCompactNumber,
  formatRuntime,
  resolveConfidenceBuckets,
  resolvePaeCellColor,
  resolvePlddtAverage,
  resolveStructureFile,
} from "../jobResultsUtils";
import type {
  BiologicalDataOutput,
  JobAccountingPayload,
  JobOutputsPayload,
  JobStatusPayload,
  ProteinCatalogDetail,
} from "../types";

type ProteinOverviewPanelProps = {
  jobId: string;
  job: JobStatusPayload | null;
  outputs: JobOutputsPayload | null;
  accounting: JobAccountingPayload | null;
  proteinDetail: ProteinCatalogDetail | null;
  compact?: boolean;
  panelLabel?: string;
  toolbar?: ReactNode;
  phantomStructureData?: string | null;
  phantomEnabled?: boolean;
  phantomLabel?: string;
  onTogglePhantom?: () => void;
  compactModuleRefs?: Partial<Record<CompactModuleKey, (node: HTMLDivElement | null) => void>>;
  compactModuleHeights?: Partial<Record<CompactModuleKey, number>>;
  hoveredPae?: { row: number; col: number } | null;
  onPaeHover?: (row: number | null, col: number | null) => void;
};

export type CompactModuleKey =
  | "header"
  | "viewer"
  | "quality"
  | "biological"
  | "secondary"
  | "metadata"
  | "catalog"
  | "annotations"
  | "resources";

type XrSupport = {
  ar: boolean;
  vr: boolean;
};

const statusClassByValue = {
  PENDING: "bg-slate-200 text-slate-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
} as const;

function buildSafetyFindings(biologicalData: BiologicalDataOutput | undefined): SafetyFinding[] {
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
}

export function ProteinOverviewPanel({
  jobId,
  job,
  outputs,
  accounting,
  proteinDetail,
  compact = false,
  panelLabel,
  toolbar,
  phantomStructureData = null,
  phantomEnabled = false,
  phantomLabel,
  onTogglePhantom,
  compactModuleRefs,
  compactModuleHeights,
  hoveredPae,
  onPaeHover,
}: ProteinOverviewPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const viewerRef = useRef<ProteinViewerHandle>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [xrSupport, setXrSupport] = useState<XrSupport>({ ar: false, vr: false });
  const [xrError, setXrError] = useState<string | null>(null);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

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

  const handleEnterXr = async (mode: "immersive-ar" | "immersive-vr") => {
    setXrError(null);

    try {
      await viewerRef.current?.requestXrSession(mode);
    } catch (error) {
      setXrError(error instanceof Error ? error.message : t("jobLogs.compare.xrStartError"));
    }
  };

  const paeOriginalSize = outputs?.structural_data.confidence.pae_matrix?.length ?? 1;
  const paeStep = Math.max(1, Math.ceil(paeOriginalSize / 24));

  useEffect(() => {
    if (hoveredPae === undefined) return;

    if (hoveredPae) {
      const { row } = hoveredPae;
      const startX = row * paeStep + 1;
      const endX = Math.min((row + 1) * paeStep, paeOriginalSize);
      viewerRef.current?.highlightResidues(startX, endX);
    } else {
      viewerRef.current?.clearHighlight();
    }
  }, [hoveredPae, paeStep, paeOriginalSize, viewerReady]);

  const structureData = resolveStructureFile(outputs);
  const plddtAverage = resolvePlddtAverage(outputs);
  const confidenceBuckets = resolveConfidenceBuckets(outputs);
  const bucketMax = Math.max(...confidenceBuckets.map((bucket) => bucket.value), 1);
  const paeGrid = downsamplePaeMatrix(outputs?.structural_data.confidence.pae_matrix);
  const biologicalData = outputs?.biological_data;
  const secondaryStructure = biologicalData?.secondary_structure_prediction;
  const sequenceProperties = biologicalData?.sequence_properties;
  const proteinMetadata = outputs?.protein_metadata;
  const safetyAlerts = countSafetyAlerts(outputs);
  const confidenceTotal = confidenceBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const hasSafetyData = Boolean(biologicalData);
  const safetyFindings = useMemo(() => buildSafetyFindings(biologicalData), [biologicalData]);
  const panelTitle =
    proteinMetadata?.protein_name?.trim() ||
    proteinMetadata?.identified_protein?.trim() ||
    (job ? displayJobName(job) : jobId);
  const animationKey = `${jobId}|${compact ? "compact" : "full"}|${panelLabel ?? "panel"}`;

  useAnimeReveal(panelRef, {
    selector: "[data-anime='overview-reveal']",
    dependencyKey: animationKey,
    delayStep: 65,
    duration: 500,
    translateY: 12,
    startScale: 0.996,
  });

  useAnimePressables(panelRef, {
    selector: "button, a, .anime-pressable, [data-anime='pressable']",
    dependencyKey: animationKey,
  });
  const phantomActionLabel = phantomEnabled
    ? t("jobLogs.compare.hidePhantom")
    : t("jobLogs.compare.showPhantom");
  const phantomToggleLabel = phantomLabel
    ? t("jobLogs.compare.phantomToggleAria", { action: phantomActionLabel, name: phantomLabel })
    : phantomActionLabel;
  const canTogglePhantom = Boolean(structureData && phantomStructureData);
  const getCompactWrapperProps = (moduleKey: CompactModuleKey) => {
    if (!compact) {
      return {};
    }

    const minHeight = compactModuleHeights?.[moduleKey];
    return {
      ref: compactModuleRefs?.[moduleKey],
      style: typeof minHeight === "number" ? { minHeight: `${minHeight}px` } : undefined,
    };
  };

  const biologicalInsightsCard = (
    <Card className="surface-shadow h-full flex flex-col rounded-2xl border-border/40 bg-white/95">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{t("jobLogs.details.bioInsights")}</p>

        <div className="flex flex-1 flex-col gap-3 text-[13px]">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2"
              title={t("jobLogs.details.too_solubility")}
            >
              <span>{t("jobLogs.details.solubility")}</span>
              <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
            </div>
            <span className="text-[1.25rem] font-extrabold text-primary">
              {formatCompactNumber(biologicalData?.solubility_score, 1)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div
              className="flex items-center gap-2"
              title={t("jobLogs.details.too_stability")}
            >
              <span>{t("jobLogs.details.stability")}</span>
              <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-900">
              {(biologicalData?.stability_status ?? "N/A").toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div
              className="flex items-center gap-2"
              title={t("jobLogs.details.too_instability")}
            >
              <span>{t("jobLogs.details.instability")}</span>
              <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
            </div>
            <span className="text-[1.25rem] font-extrabold text-slate-950">
              {formatCompactNumber(biologicalData?.instability_index, 1)}
            </span>
          </div>

          <button
            type="button"
            className="mt-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-left text-[12px] transition hover:bg-amber-100/60 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setIsSafetyModalOpen(true)}
            disabled={!hasSafetyData}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-bold uppercase tracking-[0.1em] leading-4">
                  {safetyAlerts > 0
                    ? t("jobLogs.details.alertsFound", { count: safetyAlerts })
                    : t("jobLogs.details.noAlerts")}
                </span>
              </div>
              <span className="text-amber-500">›</span>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const secondaryStructureCard = (
    <Card className="surface-shadow h-full flex flex-col rounded-2xl border-border/40 bg-white/95">
      <CardContent className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.secStruct")}</p>

        <div className="my-2 flex flex-1 flex-col justify-center gap-6">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="bg-primary" style={{ width: `${secondaryStructure?.helix_percent ?? 0}%` }} />
            <div className="bg-slate-950" style={{ width: `${secondaryStructure?.strand_percent ?? 0}%` }} />
            <div className="bg-slate-300" style={{ width: `${secondaryStructure?.coil_percent ?? 0}%` }} />
          </div>

          <div className={cn("grid gap-3", compact ? "grid-cols-1" : "md:grid-cols-3")}>
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

        <div className={cn("mt-auto grid gap-2.5 border-t border-border/60 pt-4", compact ? "grid-cols-1" : "md:grid-cols-3")}>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <div
              className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500"
              title={t("jobLogs.details.too_cys")}
            >
              <span>{t("jobLogs.details.cys")}</span>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </div>
            <p className="mt-2 text-[1.05rem] font-extrabold text-slate-950">
              {sequenceProperties?.cysteine_residues ?? "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <div
              className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500"
              title={t("jobLogs.details.too_arom")}
            >
              <span>{t("jobLogs.details.arom")}</span>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </div>
            <p className="mt-2 text-[1.05rem] font-extrabold text-slate-950">
              {sequenceProperties?.aromatic_residues ?? "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <div
              className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500"
              title={t("jobLogs.details.too_source")}
            >
              <span>{t("jobLogs.details.source")}</span>
              <Info className="h-3.5 w-3.5 cursor-help" />
            </div>
            <p className="mt-2 break-words text-[10px] font-extrabold uppercase tracking-[0.04em] text-slate-950">
              {biologicalData?.source ?? "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const molecularMetadataCard = (
    <Card className="surface-shadow rounded-2xl border-border/40 bg-white/95">
      <CardContent className="space-y-3 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.meta")}</p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{t("jobLogs.details.uniprot")}</p>
            <p className="mt-2 break-words text-[0.88rem] font-extrabold leading-6 tracking-[-0.02em] text-slate-950">
              {proteinMetadata?.uniprot_id ?? "N/A"}
              {proteinMetadata?.organism ? ` (${proteinMetadata.organism})` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{t("jobLogs.details.mw")}</p>
            <p className="mt-2 text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950">
              {formatCompactNumber(sequenceProperties?.molecular_weight_kda, 1)} kDa
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{t("jobLogs.details.charges")} (+/-)</p>
            <p className="mt-2 text-[0.88rem] font-extrabold tracking-[-0.02em] text-slate-950">
              {sequenceProperties
                ? `${sequenceProperties.positive_charges} / ${sequenceProperties.negative_charges}`
                : "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const proteinCatalogContextCard = (
    <Card className="surface-shadow border-border/50 bg-card/95">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.proteinCat")}</p>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="rounded-lg border border-border/60 bg-secondary/35 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.category")}</p>
            <p className="mt-1 font-semibold text-slate-900">{proteinDetail?.category ?? "N/A"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/35 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.function")}</p>
            <p className="mt-1 font-semibold text-slate-900">{proteinDetail?.function ?? "N/A"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/35 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.cellular")}</p>
            <p className="mt-1 font-semibold text-slate-900">{proteinDetail?.cellular_location ?? "N/A"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/35 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("jobLogs.details.activity")}</p>
            <p className="mt-1 font-semibold text-slate-900">{proteinDetail?.activity ?? "N/A"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const annotationsCard = (
    <Card className="surface-shadow border-border/50 bg-card/95">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.annotations")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(proteinDetail?.tags ?? []).length > 0 ? (
            proteinDetail?.tags?.map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("jobLogs.details.noTags")}</p>
          )}
        </div>

        <div className="space-y-3">
          {(proteinDetail?.known_structures ?? []).length > 0 ? (
            proteinDetail?.known_structures?.map((structure, index) => (
              <div
                key={`${structure.pdb_id ?? "structure"}-${index}`}
                className="rounded-lg border border-border/60 bg-secondary/35 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{structure.pdb_id ?? t("jobLogs.details.unknownStruct")}</p>
                  <Badge variant="muted">{structure.method ?? t("jobLogs.details.unknownMethod")}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {structure.publication ?? t("jobLogs.details.publicationUnavail")}
                  {typeof structure.resolution === "number" ? ` · ${formatCompactNumber(structure.resolution, 1)} Å` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("jobLogs.details.noStructs")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div ref={panelRef} className="space-y-4">
        <div {...getCompactWrapperProps("header")}>
          <div
          data-anime="overview-reveal"
          className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-white/85 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,34,0.06)]"
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                {panelLabel ? (
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{panelLabel}</p>
                ) : null}
                <h2 className="mt-1 break-words font-headline text-[1.45rem] font-extrabold leading-none tracking-[-0.04em] text-slate-950">
                  {panelTitle}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="rounded-full border border-border/60 bg-slate-50 px-2.5 py-1 font-semibold uppercase tracking-[0.12em]">
                    {jobId}
                  </span>
                  {job?.status ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold uppercase tracking-[0.08em]",
                        statusClassByValue[job.status]
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {t(statusTranslationKey[job.status])}
                    </span>
                  ) : null}
                  {proteinMetadata?.organism ? <span>{proteinMetadata.organism}</span> : null}
                </div>
              </div>

              {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
            </div>
          </div>
        </div>

        <div
          data-anime="overview-reveal"
          className={cn("grid gap-4", compact ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_320px]")}
        >
          <div {...getCompactWrapperProps("viewer")}>
            <section data-anime="overview-reveal" className="flex min-w-0 flex-col space-y-4">
              <Card data-anime="overview-reveal" className="surface-shadow-strong overflow-hidden rounded-2xl border-border/40 bg-white/95">
                <CardContent className="p-0">
                  <div
                    className={cn(
                      "relative overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.96),rgba(246,248,248,0.92)_42%,rgba(235,240,238,0.9)_100%)]",
                      compact ? "h-[420px]" : "h-[480px] xl:h-[550px]"
                    )}
                  >
                    {structureData ? (
                      <div className="absolute inset-0 p-3">
                        <ProteinViewer
                          ref={viewerRef}
                          structureData={structureData}
                          phantomStructureData={phantomStructureData}
                          phantomEnabled={phantomEnabled}
                          onReadyChange={setViewerReady}
                        />
                      </div>
                    ) : (
                      <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">
                        {t("jobLogs.details.noStructure")}
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,transparent_38%,rgba(20,36,29,0.03)_100%)]" />

                    {compact && onTogglePhantom ? (
                      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
                        <Button
                          type="button"
                          variant={phantomEnabled ? "default" : "outline"}
                          className="h-8 rounded-xl px-4 text-[10px] font-bold uppercase tracking-[0.1em] shadow-sm"
                          aria-label={phantomToggleLabel}
                          disabled={!canTogglePhantom}
                          onClick={onTogglePhantom}
                        >
                          {phantomActionLabel}
                        </Button>
                      </div>
                    ) : null}

                    {!compact ? (
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/96 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,34,0.12)]">
                        <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100">
                          <Search className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <Button type="button" className="h-8 w-8 rounded-xl p-0">
                          <Camera className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          className="h-8 gap-1.5 rounded-xl px-3 text-[9px] uppercase tracking-[0.14em]"
                          disabled={!viewerReady || !xrSupport.vr || !structureData}
                          onClick={() => void handleEnterXr("immersive-vr")}
                        >
                          <BrainCircuit className="h-3 w-3" />
                          VR
                        </Button>
                        <Button
                          type="button"
                          className="h-8 gap-1.5 rounded-xl px-3 text-[9px] uppercase tracking-[0.14em]"
                          disabled={!viewerReady || !xrSupport.ar || !structureData}
                          onClick={() => void handleEnterXr("immersive-ar")}
                        >
                          <Dna className="h-3 w-3" />
                          AR
                        </Button>
                        <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100">
                          <Expand className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {xrError ? (
                <div data-anime="overview-reveal" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {xrError}
                </div>
              ) : null}
            </section>
          </div>

          <div {...getCompactWrapperProps("quality")}>
            <aside data-anime="overview-reveal" className="min-w-0">
              <Card data-anime="overview-reveal" className="surface-shadow h-full rounded-2xl border-border/40 bg-white/95">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.plddt")}</p>
                        <Info className="h-3.5 w-3.5 text-slate-400" />
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

                    <div className={cn(compact ? "mx-auto w-full max-w-[340px]" : "w-full")}>
                      <div className={cn("flex items-end gap-1", compact ? "h-14" : "h-9")}>
                        {confidenceBuckets.map((bucket) => (
                          <div
                            key={bucket.key}
                            className={`${bucket.toneClass} flex-1 rounded-t-sm`}
                            style={{ height: `${Math.max((bucket.value / bucketMax) * 100, bucket.value > 0 ? 12 : 0)}%` }}
                          />
                        ))}
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="conf-gradient h-1.5 rounded-full" />
                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          <span>{t("jobLogs.details.veryLow")}</span>
                          <span>{t("jobLogs.details.high")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2" title={t("jobLogs.details.too_pae")}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{t("jobLogs.details.pae")}</p>
                      <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
                    </div>

                    <div
                      className={cn(
                        "grid gap-px overflow-hidden rounded-xl bg-emerald-50/80 ring-1 ring-emerald-100",
                        compact ? "mx-auto aspect-square w-full max-w-[340px]" : "aspect-square"
                      )}
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
                                className={cn(
                                  "relative z-10 min-h-0 min-w-0 origin-center cursor-crosshair transition-all",
                                  hoveredPae?.row === rowIndex && hoveredPae?.col === colIndex
                                    ? "z-20 scale-[1.3] ring-2 ring-white"
                                    : "hover:z-20 hover:scale-[1.3] hover:ring-2 hover:ring-white"
                                )}
                                style={{ backgroundColor: resolvePaeCellColor(value) }}
                                title={t("jobLogs.details.paeCellTooltip", {
                                  startX,
                                  endX,
                                  startY,
                                  endY,
                                  error: formatCompactNumber(value, 2),
                                })}
                                onMouseEnter={() => {
                                  viewerRef.current?.highlightResidues(startX, endX);
                                  onPaeHover?.(rowIndex, colIndex);
                                }}
                                onMouseLeave={() => {
                                  viewerRef.current?.clearHighlight();
                                  onPaeHover?.(null, null);
                                }}
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
        </div>

        {compact ? (
          <div className="grid gap-4">
            <div {...getCompactWrapperProps("biological")}>{biologicalInsightsCard}</div>
            <div {...getCompactWrapperProps("secondary")}>{secondaryStructureCard}</div>
            <div {...getCompactWrapperProps("metadata")}>{molecularMetadataCard}</div>
            <div {...getCompactWrapperProps("catalog")}>{proteinCatalogContextCard}</div>
            <div {...getCompactWrapperProps("annotations")}>{annotationsCard}</div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              {biologicalInsightsCard}
              {secondaryStructureCard}
            </div>
            <div className="min-w-0 self-start space-y-4">
              {molecularMetadataCard}
              {proteinCatalogContextCard}
              {annotationsCard}
            </div>
          </div>
        )}

        <div
          data-anime="overview-reveal"
          className={cn("grid gap-4 rounded-2xl border border-border/40 bg-white/95 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,34,0.08)]", compact ? "grid-cols-1" : "md:grid-cols-4")}
        >
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
      </div>

      <SafetyFindingsModal
        isOpen={isSafetyModalOpen}
        findings={safetyFindings}
        onClose={() => setIsSafetyModalOpen(false)}
      />
    </>
  );
}
