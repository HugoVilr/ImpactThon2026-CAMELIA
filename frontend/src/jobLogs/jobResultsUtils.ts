import type { JobOutputsPayload } from "./types";

export type JobDetailsTab = "viewer" | "logs" | "extras" | "compare";

export type ConfidenceBucket = {
  key: string;
  label: string;
  value: number;
  toneClass: string;
};

export const resolveStructureFile = (outputs: JobOutputsPayload | null): string | null => {
  if (!outputs) {
    return null;
  }

  return outputs.structural_data.cif_file ?? outputs.structural_data.pdb_file ?? null;
};

export const resolvePlddtAverage = (outputs: JobOutputsPayload | null): number | null => {
  const confidenceMean = outputs?.structural_data.confidence.plddt_mean;
  if (typeof confidenceMean === "number") {
    return confidenceMean;
  }

  const metadataMean = outputs?.protein_metadata?.plddt_average;
  return typeof metadataMean === "number" ? metadataMean : null;
};

export const resolveConfidenceBuckets = (outputs: JobOutputsPayload | null): ConfidenceBucket[] => {
  const histogram = outputs?.structural_data.confidence.plddt_histogram ?? {};

  return [
    { key: "low", label: "Very Low", value: histogram.low ?? 0, toneClass: "bg-orange-500" },
    { key: "medium", label: "Low", value: histogram.medium ?? 0, toneClass: "bg-amber-400" },
    { key: "high", label: "Confident", value: histogram.high ?? 0, toneClass: "bg-sky-400" },
    { key: "very_high", label: "Very High", value: histogram.very_high ?? 0, toneClass: "bg-blue-700" },
  ];
};

export const countSafetyAlerts = (outputs: JobOutputsPayload | null): number => {
  const biologicalData = outputs?.biological_data;
  if (!biologicalData) {
    return 0;
  }

  return (biologicalData.toxicity_alerts?.length ?? 0) + (biologicalData.allergenicity_alerts?.length ?? 0);
};

export const downsamplePaeMatrix = (matrix: number[][] | undefined, targetSize = 24): number[][] => {
  if (!matrix || matrix.length === 0 || matrix[0]?.length === 0) {
    return [];
  }

  const rows = matrix.length;
  const cols = matrix[0].length;
  const rowStep = Math.max(1, Math.ceil(rows / targetSize));
  const colStep = Math.max(1, Math.ceil(cols / targetSize));
  const reduced: number[][] = [];

  for (let row = 0; row < rows; row += rowStep) {
    const nextRow: number[] = [];

    for (let col = 0; col < cols; col += colStep) {
      let sum = 0;
      let count = 0;

      for (let innerRow = row; innerRow < Math.min(row + rowStep, rows); innerRow += 1) {
        for (let innerCol = col; innerCol < Math.min(col + colStep, cols); innerCol += 1) {
          sum += matrix[innerRow][innerCol];
          count += 1;
        }
      }

      nextRow.push(count > 0 ? sum / count : 0);
    }

    reduced.push(nextRow);
  }

  return reduced;
};

export const resolvePaeCellColor = (value: number): string => {
  if (value <= 2) {
    return "#0f766e";
  }

  if (value <= 5) {
    return "#16a34a";
  }

  if (value <= 10) {
    return "#eab308";
  }

  return "#ea580c";
};

export const formatCompactNumber = (value: number | null | undefined, digits = 1): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return value.toFixed(digits);
};

export const formatRuntime = (value: number | null | undefined): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  if (value < 60) {
    return `${Math.round(value)} s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes} min ${seconds}s`;
};
