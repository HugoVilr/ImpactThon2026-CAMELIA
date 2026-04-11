import type { Job } from "../types/domain";
import type { JobLogEntry, JobLogLevel, JobProgressViewModel } from "./types";

type SyntheticTemplate = {
  offsetSeconds: number;
  level: JobLogLevel;
  message: string;
};

const syntheticTemplates: SyntheticTemplate[] = [
  {
    offsetSeconds: 0,
    level: "info",
    message: "Job initialized. System environment validated.",
  },
  {
    offsetSeconds: 4,
    level: "progress",
    message: "MSA search started using UniRef90 database.",
  },
  {
    offsetSeconds: 200,
    level: "warning",
    message: "High memory utilization detected. Optimizing cache layers.",
  },
  {
    offsetSeconds: 360,
    level: "progress",
    message: "Folding step 2/5: Feature extraction complete.",
  },
  {
    offsetSeconds: 510,
    level: "error",
    message: "Convergence threshold not met in region B. Re-running cycle 4.",
  },
  {
    offsetSeconds: 640,
    level: "info",
    message: "Secondary structure alignment synchronized with local cache.",
  },
  {
    offsetSeconds: 780,
    level: "progress",
    message: "Folding step 4/5: Neural network backbone processing.",
  },
];

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const parseIsoDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatTime = (value: Date): string => {
  return value.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const formatTimestampValue = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return formatTime(new Date());
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return formatTime(parsedDate);
  }

  return trimmed.slice(0, 8);
};

const inferLogLevel = (message: string): JobLogLevel => {
  const lowercaseMessage = message.toLowerCase();
  if (
    lowercaseMessage.includes("error") ||
    lowercaseMessage.includes("failed") ||
    lowercaseMessage.includes("threshold")
  ) {
    return "error";
  }

  if (lowercaseMessage.includes("warning") || lowercaseMessage.includes("memory")) {
    return "warning";
  }

  if (
    lowercaseMessage.includes("step") ||
    lowercaseMessage.includes("search") ||
    lowercaseMessage.includes("processing") ||
    lowercaseMessage.includes("running")
  ) {
    return "progress";
  }

  return "info";
};

const normalizeLevelToken = (token: string | undefined): JobLogLevel | null => {
  if (!token) {
    return null;
  }

  const normalized = token.trim().toUpperCase();
  const levelByTag: Record<string, JobLogLevel> = {
    INFO: "info",
    WARN: "warning",
    WARNING: "warning",
    ERROR: "error",
    DEBUG: "progress",
    PROGRESS: "progress",
  };

  return levelByTag[normalized] ?? null;
};

const isTimestampToken = (value: string): boolean => {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return true;
  }

  const parsedDate = Date.parse(value);
  return !Number.isNaN(parsedDate);
};

const estimateRunningPercent = (job: Job): number => {
  const maxRuntime = job.max_runtime_seconds;
  const startTime = parseIsoDate(job.started_at) ?? parseIsoDate(job.created_at);
  if (!startTime || maxRuntime <= 0) {
    return 56;
  }

  const elapsedSeconds = Math.max(0, (Date.now() - startTime.getTime()) / 1000);
  return clamp(Math.round((elapsedSeconds / maxRuntime) * 100), 20, 94);
};

export const resolveProgressViewModel = (job: Job | null): JobProgressViewModel => {
  if (!job) {
    return {
      titleKey: "jobLogs.progress.loadingTitle",
      percent: 8,
      indeterminate: true,
      currentStep: 0,
      totalSteps: 5,
      phase: "init",
      toneClass: "bg-slate-500",
    };
  }

  if (job.status === "PENDING") {
    return {
      titleKey: "jobLogs.progress.pendingTitle",
      percent: 16,
      indeterminate: true,
      currentStep: 1,
      totalSteps: 5,
      phase: "queue",
      toneClass: "bg-primary",
    };
  }

  if (job.status === "RUNNING") {
    const percent = estimateRunningPercent(job);
    const currentStep = percent < 40 ? 2 : percent < 70 ? 3 : 4;
    const phase = currentStep === 2 ? "msa" : currentStep === 3 ? "features" : "folding";

    return {
      titleKey: "jobLogs.progress.runningTitle",
      percent,
      indeterminate: false,
      currentStep,
      totalSteps: 5,
      phase,
      toneClass: "bg-primary",
    };
  }

  if (job.status === "COMPLETED") {
    return {
      titleKey: "jobLogs.progress.completedTitle",
      percent: 100,
      indeterminate: false,
      currentStep: 5,
      totalSteps: 5,
      phase: "complete",
      toneClass: "bg-emerald-500",
    };
  }

  if (job.status === "CANCELLED") {
    return {
      titleKey: "jobLogs.progress.cancelledTitle",
      percent: 100,
      indeterminate: false,
      currentStep: 4,
      totalSteps: 5,
      phase: "cancelled",
      toneClass: "bg-red-500",
    };
  }

  return {
    titleKey: "jobLogs.progress.failedTitle",
    percent: 100,
    indeterminate: false,
    currentStep: 4,
    totalSteps: 5,
    phase: "failed",
    toneClass: "bg-red-500",
  };
};

export const parseRawLogs = (rawLogs: string): JobLogEntry[] => {
  const lines = rawLogs
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let lastKnownTimestamp = formatTime(new Date());

  return lines.map((line, index) => {
    const parsedLine = line.match(/^\[([^\]]+)\]\s*(?:\[([^\]]+)\]\s*)?(.*)$/i);

    if (!parsedLine) {
      return {
        id: `raw-${index}`,
        timestamp: lastKnownTimestamp,
        message: line,
        level: inferLogLevel(line),
      };
    }

    const [, firstTokenRaw, secondTokenRaw, message] = parsedLine;
    const firstToken = firstTokenRaw.trim();
    const secondToken = secondTokenRaw?.trim();
    const normalizedMessage = message.trim();
    const firstLevel = normalizeLevelToken(firstToken);
    const secondLevel = normalizeLevelToken(secondToken);

    let timestamp = lastKnownTimestamp;
    let level: JobLogLevel | null = null;

    if (isTimestampToken(firstToken)) {
      timestamp = formatTimestampValue(firstToken);
      lastKnownTimestamp = timestamp;
      level = secondLevel;
    } else {
      if (isTimestampToken(secondToken ?? "")) {
        timestamp = formatTimestampValue(secondToken ?? "");
        lastKnownTimestamp = timestamp;
      }

      // If no timestamp in this line, preserve latest known timestamp.
      level = secondLevel ?? firstLevel;
    }

    const inferredLevel = inferLogLevel(normalizedMessage);
    let resolvedLevel = level ?? inferredLevel;

    // Some providers emit generic [INFO] tags for progress lines.
    // Preserve explicit warning/error tags, but allow INFO -> PROGRESS promotion by message.
    if (resolvedLevel === "info" && inferredLevel !== "info") {
      resolvedLevel = inferredLevel;
    }

    return {
      id: `raw-${index}`,
      timestamp,
      message: normalizedMessage,
      level: resolvedLevel,
    };
  });
};

export const buildSyntheticLogs = (job: Job | null): JobLogEntry[] => {
  const progress = resolveProgressViewModel(job);
  const referenceDate = parseIsoDate(job?.created_at ?? null) ?? new Date();

  const visibleCountByStep: Record<number, number> = {
    0: 1,
    1: 2,
    2: 4,
    3: 6,
    4: 7,
    5: 7,
  };
  const visibleCount = visibleCountByStep[progress.currentStep] ?? 3;

  const entries = syntheticTemplates.slice(0, visibleCount).map((template, index) => ({
    id: `synthetic-${index}`,
    timestamp: formatTime(new Date(referenceDate.getTime() + template.offsetSeconds * 1000)),
    message: template.message,
    level: template.level,
  }));

  if (job?.status === "FAILED") {
    entries.push({
      id: "synthetic-failed",
      timestamp: formatTime(new Date()),
      message: job.error_message?.trim() || "Execution failed unexpectedly.",
      level: "error",
    });
  }

  if (job?.status === "CANCELLED") {
    entries.push({
      id: "synthetic-cancelled",
      timestamp: formatTime(new Date()),
      message: "Job cancelled by user request.",
      level: "warning",
    });
  }

  if (job?.status === "COMPLETED") {
    entries.push({
      id: "synthetic-complete",
      timestamp: formatTime(new Date()),
      message: "Output artifacts generated successfully. Results ready for inspection.",
      level: "info",
    });
  }

  return entries;
};

export const composeDownloadableLogs = (entries: JobLogEntry[]): string => {
  return entries.map((entry) => `[${entry.timestamp}] ${entry.message}`).join("\n");
};

export const isJobActive = (job: Job | null): boolean => {
  return job?.status === "PENDING" || job?.status === "RUNNING";
};
